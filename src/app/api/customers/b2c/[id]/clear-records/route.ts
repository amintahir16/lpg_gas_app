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
    const customer = await prisma.b2CCustomer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'B2C Customer not found' }, { status: 404 });
    }

    // Execute atomic cleanup transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find all transactions
      const transactions = await tx.b2CTransaction.findMany({
        where: { customerId },
        select: { id: true },
      });
      const transactionIds = transactions.map((t) => t.id);

      // 2. Delete transaction line items
      let deletedGasItems = 0;
      let deletedSecurityItems = 0;
      let deletedAccessoryItems = 0;

      if (transactionIds.length > 0) {
        const gasRes = await tx.b2CTransactionGasItem.deleteMany({
          where: { transactionId: { in: transactionIds } },
        });
        deletedGasItems = gasRes.count;

        const secRes = await tx.b2CTransactionSecurityItem.deleteMany({
          where: { transactionId: { in: transactionIds } },
        });
        deletedSecurityItems = secRes.count;

        const accRes = await tx.b2CTransactionAccessoryItem.deleteMany({
          where: { transactionId: { in: transactionIds } },
        });
        deletedAccessoryItems = accRes.count;

        // 3. Delete transactions
        await tx.b2CTransaction.deleteMany({
          where: { id: { in: transactionIds } },
        });
      }

      // 4. Delete cylinder holdings
      const deletedHoldings = await tx.b2CCylinderHolding.deleteMany({
        where: { customerId },
      });

      // 5. Return physical cylinders held by this customer back to inventory with status EMPTY
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

      // 6. Reset customer profit and bill sequence
      const updatedCustomer = await tx.b2CCustomer.update({
        where: { id: customerId },
        data: {
          totalProfit: 0,
          billSequence: 0,
        },
      });

      return {
        updatedCustomer,
        clearedStats: {
          transactions: transactions.length,
          gasItems: deletedGasItems,
          securityItems: deletedSecurityItems,
          accessoryItems: deletedAccessoryItems,
          cylinderHoldings: deletedHoldings.count,
          reclaimedCylinders: reclaimedCylinders.count,
        },
      };
    }, {
      maxWait: 20000,
      timeout: 60000,
    });

    // 7. Log activity for audit
    await logActivity({
      userId: auth.session.user.id,
      action: ActivityAction.B2C_CUSTOMER_RECORDS_CLEARED,
      entityType: 'B2C_CUSTOMER',
      entityId: customer.id,
      details: `Cleared all records for B2C customer "${customer.name}". Reason: ${reason}`,
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
    console.error('Error clearing B2C customer records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear customer records' },
      { status: 500 }
    );
  }
}
