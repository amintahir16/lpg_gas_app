import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, belongsToActiveRegion } from '@/lib/region';
import { ActivityAction, logActivity } from '@/lib/activityLogger';
import {
  assertPurchaseEffectsReversible,
  reversePurchaseInventoryEffects,
  reverseHistoricalPurchaseInventoryFallback,
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

    let existingBatch = await prisma.vendorPurchaseBatch.findFirst({
      where: {
        vendorId,
        OR: [{ id: batchId }, { invoiceNumber: batchId }],
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

    // If no batch exists, check for unbatched purchase entries (historical purchases)
    let fallbackEntries: any[] = [];
    if (!existingBatch) {
      fallbackEntries = await prisma.purchaseEntry.findMany({
        where: {
          vendorId,
          OR: [{ invoiceNumber: batchId }, { id: batchId }],
        },
      });

      if (fallbackEntries.length === 0) {
        return NextResponse.json(
          { error: 'Purchase entry not found' },
          { status: 404 }
        );
      }
    }

    if (existingBatch && !belongsToActiveRegion(existingBatch.regionId, regionId)) {
      return NextResponse.json({ error: 'Purchase not found in active region' }, { status: 404 });
    }

    if (existingBatch && existingBatch.status === 'UNDONE') {
      return NextResponse.json({
        alreadyUndone: true,
        message: 'Purchase entry is already undone',
        batch: existingBatch,
      });
    }

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        let batch;

        if (existingBatch) {
          batch = await tx.vendorPurchaseBatch.findFirst({
            where: {
              id: existingBatch.id,
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
        } else {
          // Dynamic batch synthesis for historical unbatched purchases
          const firstEntry = fallbackEntries[0];
          const invoiceNum = firstEntry.invoiceNumber || null;
          const totalAmt = fallbackEntries.reduce((sum, e) => sum + Number(e.totalPrice || 0), 0);

          const newBatch = await tx.vendorPurchaseBatch.create({
            data: {
              vendorId,
              invoiceNumber: invoiceNum,
              category: firstEntry.category || 'GAS_PURCHASE',
              purchaseDate: firstEntry.purchaseDate,
              totalAmount: totalAmt,
              status: 'ACTIVE',
              createdBy: firstEntry.userId || session.user.id,
              regionId: firstEntry.regionId || null,
            },
          });

          // Link entries to the new batch
          await tx.purchaseEntry.updateMany({
            where: { id: { in: fallbackEntries.map((e) => e.id) } },
            data: { purchaseBatchId: newBatch.id },
          });

          // Link any payments matching invoice number
          if (invoiceNum) {
            await tx.vendorPayment.updateMany({
              where: {
                vendorId,
                purchaseBatchId: null,
                description: { contains: invoiceNum },
              },
              data: { purchaseBatchId: newBatch.id },
            });
          }

          batch = await tx.vendorPurchaseBatch.findUnique({
            where: { id: newBatch.id },
            include: {
              inventoryEffects: true,
              payments: true,
              purchaseEntries: true,
            },
          });
        }

        if (!batch) {
          throw Object.assign(new Error('Purchase batch is no longer active'), {
            statusCode: 409,
          });
        }

        let effectCount = batch.inventoryEffects?.length || 0;
        if (batch.inventoryEffects && batch.inventoryEffects.length > 0) {
          await assertPurchaseEffectsReversible(tx, batch.inventoryEffects);
          await reversePurchaseInventoryEffects(tx, batch.inventoryEffects);
        } else if (batch.purchaseEntries && batch.purchaseEntries.length > 0) {
          effectCount = await reverseHistoricalPurchaseInventoryFallback(
            tx,
            batch.purchaseEntries,
            batch.regionId || regionId,
          );
        }

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
          effectCount,
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
