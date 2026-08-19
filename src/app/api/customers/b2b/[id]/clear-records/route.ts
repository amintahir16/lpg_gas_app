import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { CylinderStatus } from '@prisma/client';
import { regionScopedWhere } from '@/lib/region';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id: customerId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'A valid reason (minimum 5 characters) is required to clear customer records.' },
        { status: 400 }
      );
    }

    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'B2B Customer not found' }, { status: 404 });
    }

    // Execute atomic cleanup transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find all transactions
      const transactions = await tx.b2BTransaction.findMany({
        where: { customerId },
        select: { id: true },
      });
      const transactionIds = transactions.map((t) => t.id);

      // 2. Delete transaction line items
      let deletedItemsCount = 0;
      if (transactionIds.length > 0) {
        const deletedItems = await tx.b2BTransactionItem.deleteMany({
          where: { transactionId: { in: transactionIds } },
        });
        deletedItemsCount = deletedItems.count;

        // 3. Delete transactions
        await tx.b2BTransaction.deleteMany({
          where: { id: { in: transactionIds } },
        });
      }

      // 4. Delete ledger entries
      const deletedLedger = await tx.customerLedger.deleteMany({
        where: { customerId },
      });

      // 5. Delete cylinder rentals
      const deletedRentals = await tx.cylinderRental.deleteMany({
        where: { customerId },
      });

      // 6. Delete support requests
      const deletedSupport = await tx.supportRequest.deleteMany({
        where: { customerId },
      });

      // 7. Return physical cylinders held by this customer back to inventory with status EMPTY
      const reclaimedCylinders = await tx.cylinder.updateMany({
        where: {
          currentStatus: CylinderStatus.WITH_CUSTOMER,
          location: { contains: customer.name, mode: 'insensitive' },
          ...(customer.regionId ? regionScopedWhere(customer.regionId) : {}),
        },
        data: {
          currentStatus: CylinderStatus.EMPTY,
          location: 'Main Store',
        },
      });

      // 8. Reset customer balance, dues, and bill sequence
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          ledgerBalance: 0,
          billSequence: 0,
          domestic118kgDue: 0,
          standard15kgDue: 0,
          commercial454kgDue: 0,
        },
      });

      return {
        updatedCustomer,
        clearedStats: {
          transactions: transactions.length,
          transactionItems: deletedItemsCount,
          ledgerEntries: deletedLedger.count,
          rentals: deletedRentals.count,
          supportRequests: deletedSupport.count,
          reclaimedCylinders: reclaimedCylinders.count,
        },
      };
    }, {
      maxWait: 20000,
      timeout: 60000,
    });

    // 9. Log activity for audit
    await logActivity({
      userId: auth.session.user.id,
      action: ActivityAction.B2B_CUSTOMER_RECORDS_CLEARED,
      entityType: 'B2B_CUSTOMER',
      entityId: customer.id,
      details: `Cleared all records for B2B customer "${customer.name}". Reason: ${reason}`,
      metadata: {
        customerId: customer.id,
        customerName: customer.name,
        reason,
        ...result.clearedStats,
      },
      regionId: customer.regionId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all records for customer "${customer.name}".`,
      customer: result.updatedCustomer,
      clearedStats: result.clearedStats,
    });
  } catch (error) {
    console.error('Error clearing B2B customer records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear customer records' },
      { status: 500 }
    );
  }
}
