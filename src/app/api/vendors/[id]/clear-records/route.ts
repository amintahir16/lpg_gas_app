import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id: vendorId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'A valid reason (minimum 5 characters) is required to clear vendor records.' },
        { status: 400 }
      );
    }

    // Find vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { category: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const vendorDisplayName = vendor.companyName || vendor.vendorCode;

    // Execute atomic cleanup transaction (purely clears purchase and payment records without altering inventory)
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch batches to delete linked effects
        const batches = await tx.vendorPurchaseBatch.findMany({
          where: { vendorId },
          select: { id: true },
        });
        const batchIds = batches.map((b) => b.id);

        // 2. Delete PurchaseInventoryEffects linked to vendor batches
        let deletedEffectsCount = 0;
        if (batchIds.length > 0) {
          const delEffects = await tx.purchaseInventoryEffect.deleteMany({
            where: { purchaseBatchId: { in: batchIds } },
          });
          deletedEffectsCount = delEffects.count;
        }

        // 3. Delete Purchase Entries
        const deletedEntries = await tx.purchaseEntry.deleteMany({
          where: { vendorId },
        });

        // 4. Delete Vendor Payments
        const deletedPayments = await tx.vendorPayment.deleteMany({
          where: { vendorId },
        });

        // 5. Delete Vendor Purchase Batches
        const deletedBatches = await tx.vendorPurchaseBatch.deleteMany({
          where: { vendorId },
        });

        // 6. Delete Vendor Inventories (vendor catalog items)
        const deletedInventories = await tx.vendorInventory.deleteMany({
          where: { vendorId },
        });

        // 7. Delete Vendor Orders
        const deletedOrders = await tx.vendorOrder.deleteMany({
          where: { vendorId },
        });

        // 8. Delete Vendor Support Requests
        const deletedSupport = await tx.vendorSupportRequest.deleteMany({
          where: { vendorId },
        });

        // 9. Delete Vendor Financial Reports
        const deletedReports = await tx.vendorFinancialReport.deleteMany({
          where: { vendorId },
        });

        // 10. Delete Invoices linked to this vendor
        const deletedInvoices = await tx.invoice.deleteMany({
          where: { vendorId },
        });

        return {
          clearedStats: {
            purchaseBatches: deletedBatches.count,
            purchaseEntries: deletedEntries.count,
            payments: deletedPayments.count,
            inventoryEffects: deletedEffectsCount,
            vendorInventories: deletedInventories.count,
            vendorOrders: deletedOrders.count,
            supportRequests: deletedSupport.count,
            financialReports: deletedReports.count,
            invoices: deletedInvoices.count,
          },
        };
      },
      {
        maxWait: 20000,
        timeout: 60000,
      }
    );

    // 11. Log activity for audit
    await logActivity({
      userId: auth.session.user.id,
      action: ActivityAction.VENDOR_RECORDS_CLEARED,
      entityType: 'VENDOR',
      entityId: vendor.id,
      details: `Cleared all purchase and payment records for vendor "${vendorDisplayName}". Reason: ${reason}`,
      metadata: {
        vendorId: vendor.id,
        vendorName: vendorDisplayName,
        reason,
        ...result.clearedStats,
      },
      regionId: vendor.regionId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all purchase and payment records for vendor "${vendorDisplayName}".`,
      clearedStats: result.clearedStats,
    });
  } catch (error) {
    console.error('Error clearing vendor records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear vendor records' },
      { status: 500 }
    );
  }
}
