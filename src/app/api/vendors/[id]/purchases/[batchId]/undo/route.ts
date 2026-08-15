import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, belongsToActiveRegion } from '@/lib/region';
import { ActivityAction, logActivity } from '@/lib/activityLogger';
import {
  assertPurchaseEffectsReversible,
  reversePurchaseInventoryEffects,
} from '@/lib/purchase-undo';

function isAdminRole(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/**
 * POST /api/vendors/[id]/purchases/[batchId]/undo
 * Admin-only atomic undo for tracked purchase batches created after undo tracking.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; batchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json(
        { error: 'Only administrators can undo purchase entries' },
        { status: 403 }
      );
    }

    const regionId = getActiveRegionId(request);
    const { id: vendorId, batchId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!reason) {
      return NextResponse.json(
        { error: 'A reason is required to undo a purchase entry' },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, companyName: true, vendorCode: true, regionId: true },
    });

    if (!vendor || !belongsToActiveRegion(vendor.regionId, regionId)) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const existingBatch = await prisma.vendorPurchaseBatch.findFirst({
      where: {
        id: batchId,
        vendorId,
      },
      select: {
        id: true,
        status: true,
        invoiceNumber: true,
        totalAmount: true,
        undoReason: true,
        undoneAt: true,
        regionId: true,
      },
    });

    if (!existingBatch) {
      return NextResponse.json(
        {
          error:
            'This purchase cannot be undone. Only purchases created after undo tracking are eligible.',
        },
        { status: 404 }
      );
    }

    if (!belongsToActiveRegion(existingBatch.regionId, regionId)) {
      return NextResponse.json({ error: 'Purchase not found in active region' }, { status: 404 });
    }

    if (existingBatch.status === 'UNDONE') {
      return NextResponse.json({
        alreadyUndone: true,
        message: 'Purchase entry is already undone',
        batch: existingBatch,
      });
    }

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const batch = await tx.vendorPurchaseBatch.findFirst({
          where: {
            id: batchId,
            vendorId,
            status: 'ACTIVE',
          },
          include: {
            inventoryEffects: {
              orderBy: { createdAt: 'asc' },
            },
            payments: true,
            purchaseEntries: true,
          },
        });

        if (!batch) {
          throw Object.assign(new Error('Purchase batch is no longer active'), {
            statusCode: 409,
          });
        }

        await assertPurchaseEffectsReversible(tx, batch.inventoryEffects);
        await reversePurchaseInventoryEffects(tx, batch.inventoryEffects);

        if (batch.payments.length > 0) {
          await tx.vendorPayment.updateMany({
            where: {
              id: { in: batch.payments.map((p) => p.id) },
            },
            data: {
              status: 'CANCELLED',
            },
          });
        }

        if (batch.purchaseEntries.length > 0) {
          await tx.purchaseEntry.updateMany({
            where: {
              id: { in: batch.purchaseEntries.map((e) => e.id) },
            },
            data: {
              status: 'CANCELLED',
            },
          });
        }

        const undoneBatch = await tx.vendorPurchaseBatch.update({
          where: { id: batch.id },
          data: {
            status: 'UNDONE',
            undoneAt: new Date(),
            undoneBy: session.user.id,
            undoReason: reason,
          },
        });

        return {
          batch: undoneBatch,
          paymentCount: batch.payments.length,
          entryCount: batch.purchaseEntries.length,
          effectCount: batch.inventoryEffects.length,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to undo purchase';
      const statusCode =
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        typeof (error as { statusCode?: unknown }).statusCode === 'number'
          ? (error as { statusCode: number }).statusCode
          : message.startsWith('Cannot undo:')
            ? 409
            : 500;

      return NextResponse.json({ error: message }, { status: statusCode });
    }

    await logActivity({
      userId: session.user.id,
      action: ActivityAction.VENDOR_PURCHASE_UNDONE,
      entityType: 'VENDOR_PURCHASE',
      entityId: result.batch.id,
      details: `Undid purchase for "${vendor.companyName}" • Invoice: ${result.batch.invoiceNumber || 'N/A'} • Amount: Rs ${Number(result.batch.totalAmount).toLocaleString()} • Reason: ${reason}`,
      link: `/vendors/${vendorId}`,
      regionId,
      metadata: {
        vendorId,
        purchaseBatchId: result.batch.id,
        invoiceNumber: result.batch.invoiceNumber,
        totalAmount: Number(result.batch.totalAmount),
        reason,
        paymentCount: result.paymentCount,
        entryCount: result.entryCount,
        inventoryEffectCount: result.effectCount,
      },
    });

    return NextResponse.json({
      message: 'Purchase entry undone successfully',
      batch: result.batch,
    });
  } catch (error) {
    console.error('Error undoing purchase:', error);
    return NextResponse.json(
      { error: 'Failed to undo purchase' },
      { status: 500 }
    );
  }
}
