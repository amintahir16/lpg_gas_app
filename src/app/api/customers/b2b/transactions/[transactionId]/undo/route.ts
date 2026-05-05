import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CylinderStatus } from '@prisma/client';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import {
  notifyUserActivity,
  checkAllCylinderTypesForLowStock,
} from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { buildPrismaCylinderVariantWhere } from '@/lib/cylinder-variant-key';
import { getB2bCustomerCylinderDueAggregatesFromPhysicalStock } from '@/lib/b2b-customer-cylinder-dues-from-stock';
import { buildCylinderVariantSummary } from '@/lib/cylinder-variant-summary';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { transactionId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Get the transaction with all details (region-scoped)
    const transaction = await prisma.b2BTransaction.findFirst({
      where: { id: transactionId, ...regionScopedWhere(regionId) },
      include: {
        customer: true,
        items: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.voided) {
      return NextResponse.json({ error: 'Transaction is already voided' }, { status: 400 });
    }

    /** Prefer the transaction's branch so inventory reversals never leak across regions when session has no region. */
    const inventoryRegionId = transaction.regionId ?? regionId ?? null;

    // Undo the transaction - reverse all changes
    await prisma.$transaction(async (tx) => {
      // 1. Mark transaction as voided
      await tx.b2BTransaction.update({
        where: { id: transactionId },
        data: {
          voided: true,
          voidedBy: session.user.id,
          voidedAt: new Date(),
          voidReason: reason || 'Transaction reversed by admin'
        }
      });

      // 2. Reverse customer balance changes
      const customer = await tx.customer.findUnique({
        where: { id: transaction.customerId }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      let newLedgerBalance = parseFloat(customer.ledgerBalance.toString());

      // Reverse balance based on transaction type
      switch (transaction.transactionType) {
        case 'SALE':
          // Calculate buyback credit included in this transaction
          let totalBuybackCredit = 0;
          transaction.items.forEach((item: any) => {
            if (item.buybackTotal && Number(item.buybackTotal) > 0) {
              totalBuybackCredit += Number(item.buybackTotal);
            }
          });

          let impactToReverse = 0;
          if (transaction.paymentStatus === 'FULLY_PAID') {
            impactToReverse = 0 - totalBuybackCredit; // fully paid sale, but buybacks gave credit
          } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
            // unpaidAmount is gross, so we must subtract buybackCredit to find net impact
            impactToReverse = parseFloat(transaction.unpaidAmount.toString()) - totalBuybackCredit;
          } else {
            // legacy format fallback
            impactToReverse = parseFloat(transaction.totalAmount.toString()) - totalBuybackCredit;
          }

          newLedgerBalance -= impactToReverse;

          break;
        case 'PAYMENT':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          // Reverse: add back the amount (these decreased balance)
          newLedgerBalance += parseFloat(transaction.totalAmount.toString());
          break;
        case 'BUYBACK':
          // Reverse: add back the amount (this decreased balance)
          newLedgerBalance += parseFloat(transaction.totalAmount.toString());
          break;
        case 'RETURN_EMPTY':
          break;
      }

      // 3. Reverse inventory changes
      if (transaction.transactionType === 'SALE') {
        // Return cylinders to inventory - only for delivered cylinders (not returned ones)
        const gasItems = transaction.items.filter((item: any) =>
          item.cylinderType &&
          item.quantity > 0 &&
          item.returnedCondition !== 'EMPTY' // Only reverse delivered cylinders, not returned ones
        );

        for (const item of gasItems) {
          const quantity = Number(item.quantity);
          const cylinderType = item.cylinderType as string;
          const variantWhere = buildPrismaCylinderVariantWhere(
            cylinderType,
            item.cylinderVariantKey,
          );

          // Find cylinders that are WITH_CUSTOMER for this customer (region-scoped)
          const cylindersWithCustomer = await tx.cylinder.findMany({
            where: {
              ...variantWhere,
              currentStatus: CylinderStatus.WITH_CUSTOMER,
              location: { contains: customer.name },
              ...regionScopedWhere(inventoryRegionId),
            },
            orderBy: { updatedAt: 'desc' },
            take: quantity
          });

          if (cylindersWithCustomer.length >= quantity) {
            // Update back to FULL status
            await tx.cylinder.updateMany({
              where: {
                id: { in: cylindersWithCustomer.slice(0, quantity).map(c => c.id) }
              },
              data: {
                currentStatus: CylinderStatus.FULL,
                location: 'Store - Ready for Sale'
              }
            });
            console.log(`✅ Returned ${quantity} ${cylinderType} cylinders to inventory (FULL status)`);
          } else {
            console.warn(`⚠️ Warning: Could not find ${quantity} ${cylinderType} cylinders with customer ${customer.name}. Found: ${cylindersWithCustomer.length}`);
          }
        }

        // Handle cylinders that were returned in the SALE transaction
        // These need to be removed from inventory (they were added back as EMPTY)
        const returnedCylinders = transaction.items.filter((item: any) =>
          item.cylinderType &&
          item.quantity > 0 &&
          item.returnedCondition === 'EMPTY'
        );

        for (const item of returnedCylinders) {
          const quantity = Number(item.quantity);
          const cylinderType = item.cylinderType as string;
          const variantWhere = buildPrismaCylinderVariantWhere(
            cylinderType,
            item.cylinderVariantKey,
          );

          // Find EMPTY cylinders in store (region-scoped)
          const emptyCylinders = await tx.cylinder.findMany({
            where: {
              ...variantWhere,
              currentStatus: CylinderStatus.EMPTY,
              location: 'Store - Ready for Refill',
              ...regionScopedWhere(inventoryRegionId),
            },
            orderBy: { updatedAt: 'desc' },
            take: quantity
          });

          if (emptyCylinders.length >= quantity) {
            // Update back to WITH_CUSTOMER status (reverse the return)
            await tx.cylinder.updateMany({
              where: {
                id: { in: emptyCylinders.slice(0, quantity).map(c => c.id) }
              },
              data: {
                currentStatus: CylinderStatus.WITH_CUSTOMER,
                location: `Customer: ${customer.name}`
              }
            });
            console.log(`✅ Reversed return: ${quantity} ${cylinderType} cylinders back to WITH_CUSTOMER`);
          } else {
            console.warn(`⚠️ Warning: Could not find ${quantity} empty ${cylinderType} cylinders to reverse return. Found: ${emptyCylinders.length}`);
          }
        }

        // Return accessories to inventory
        const accessoryItems = transaction.items.filter((item: any) => !item.cylinderType);

        if (accessoryItems.length > 0) {
          for (const item of accessoryItems) {
            if (Number(item.quantity) <= 0) continue;

            const quantity = Number(item.quantity);
            const productName = item.productName || '';

            const category = item.category || productName.split(' - ')[0] || '';
            const itemType = productName.includes(' - ') ? productName.split(' - ').slice(1).join(' - ') : category;

            console.log(`Reversing custom accessory: ${category} - ${itemType}, quantity: ${quantity}`);

            // Try to find in CustomItem table (region-scoped)
            const customItem = await tx.customItem.findFirst({
              where: {
                name: category,
                type: itemType,
                isActive: true,
                ...regionScopedWhere(inventoryRegionId),
              }
            });

            if (customItem) {
              // Reverse the deduction by incrementing quantity
              const newQuantity = customItem.quantity + quantity;
              const newTotalCost = newQuantity * Number(customItem.costPerPiece);

              await tx.customItem.update({
                where: { id: customItem.id },
                data: {
                  quantity: newQuantity,
                  totalCost: newTotalCost,
                  updatedAt: new Date()
                }
              });
              console.log(`✅ Returned ${quantity} ${productName} to CustomItem inventory. New stock: ${newQuantity}`);
            } else {
              // Try Product table as fallback
              if (item.productId) {
                const product = await tx.product.findFirst({
                  where: { id: item.productId, ...regionScopedWhere(inventoryRegionId) }
                });

                if (product) {
                  await tx.product.update({
                    where: { id: item.productId },
                    data: {
                      stockQuantity: {
                        increment: quantity
                      }
                    }
                  });
                  console.log(`✅ Returned ${quantity} ${productName} to Product inventory`);
                } else {
                  console.warn(`⚠️ Could not find inventory item for ${productName} - manual adjustment may be needed`);
                }
              } else {
                // Try to find by name in Product table (region-scoped)
                const productByName = await tx.product.findFirst({
                  where: {
                    name: { contains: productName, mode: 'insensitive' },
                    ...regionScopedWhere(inventoryRegionId),
                  }
                });

                if (productByName) {
                  await tx.product.update({
                    where: { id: productByName.id },
                    data: {
                      stockQuantity: {
                        increment: quantity
                      }
                    }
                  });
                  console.log(`✅ Returned ${quantity} ${productName} to Product inventory (found by name)`);
                } else {
                  console.warn(`⚠️ Could not find inventory item for ${productName} - manual adjustment may be needed`);
                }
              }
            }
          }
        }
      } else if (transaction.transactionType === 'BUYBACK' || transaction.transactionType === 'RETURN_EMPTY') {
        // Reverse: Remove cylinders from inventory (they were added back as EMPTY)
        // Some may have been existing cylinders updated, some may have been newly created
        const gasItems = transaction.items.filter((item: any) => item.cylinderType && item.quantity > 0);

        for (const item of gasItems) {
          const quantity = Number(item.quantity);
          const cylinderType = item.cylinderType as string;
          const variantWhere = buildPrismaCylinderVariantWhere(
            cylinderType,
            item.cylinderVariantKey,
          );

          // Find EMPTY cylinders in store (region-scoped, most recent first)
          const emptyCylinders = await tx.cylinder.findMany({
            where: {
              ...variantWhere,
              currentStatus: CylinderStatus.EMPTY,
              location: 'Store - Ready for Refill',
              ...regionScopedWhere(inventoryRegionId),
            },
            orderBy: { updatedAt: 'desc' },
            take: quantity
          });

          if (emptyCylinders.length >= quantity) {
            // Update back to WITH_CUSTOMER status (reverse the return)
            await tx.cylinder.updateMany({
              where: {
                id: { in: emptyCylinders.slice(0, quantity).map(c => c.id) }
              },
              data: {
                currentStatus: CylinderStatus.WITH_CUSTOMER,
                location: `Customer: ${customer.name}`
              }
            });
            console.log(`✅ Reversed return: ${quantity} ${cylinderType} cylinders back to WITH_CUSTOMER`);
          } else if (emptyCylinders.length > 0) {
            // Update what we found and log warning
            await tx.cylinder.updateMany({
              where: {
                id: { in: emptyCylinders.map(c => c.id) }
              },
              data: {
                currentStatus: CylinderStatus.WITH_CUSTOMER,
                location: `Customer: ${customer.name}`
              }
            });
            console.warn(`⚠️ Warning: Only found ${emptyCylinders.length} of ${quantity} ${cylinderType} empty cylinders to reverse. Some may have been newly created during the transaction.`);
          } else {
            console.warn(`⚠️ Warning: Could not find any empty ${cylinderType} cylinders to reverse return for ${customer.name}`);
          }
        }
      }

      const cylinderDues = await getB2bCustomerCylinderDueAggregatesFromPhysicalStock(tx, {
        customerName: customer.name || '',
        regionId: inventoryRegionId,
      });

      await tx.customer.update({
        where: { id: transaction.customerId },
        data: {
          ledgerBalance: newLedgerBalance,
          domestic118kgDue: cylinderDues.domestic118kgDue,
          standard15kgDue: cylinderDues.standard15kgDue,
          commercial454kgDue: cylinderDues.commercial454kgDue,
          updatedBy: session.user.id,
        },
      });
    });
    const activityRegionId = inventoryRegionId ?? regionId;

    // ---- Post-commit side effects ----
    try {
      const customerName = transaction.customer?.name || 'Customer';
      const total = parseFloat(transaction.totalAmount.toString());
      const link = `/customers/b2b/${transaction.customerId}?tx=${transaction.id}`;
      const cylinderSummary = buildCylinderVariantSummary(
        (transaction.items || [])
          .filter((it: any) => it?.cylinderType)
          .map((it: any) => ({
            cylinderType: it.cylinderType ?? null,
            cylinderVariantKey: it.cylinderVariantKey ?? null,
            quantity: Number(it.quantity || 0),
          })),
      );

      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2B_TRANSACTION_VOIDED,
        entityType: 'B2B_TRANSACTION',
        entityId: transaction.id,
        details: `Voided B2B ${transaction.transactionType} • Customer: ${customerName} • Bill #: ${transaction.billSno} • Total: Rs ${total.toLocaleString()}${cylinderSummary ? ` • Items: ${cylinderSummary}` : ''}${reason ? ` • Reason: ${reason}` : ''}`,
        link,
        regionId: activityRegionId,
        metadata: {
          customerId: transaction.customerId,
          customerName,
          billSno: transaction.billSno,
          transactionType: transaction.transactionType,
          totalAmount: total,
          reason: reason || null,
          cylinderSummary: cylinderSummary || null,
        },
      });

      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: `B2B ${transaction.transactionType} transaction voided`,
        message: `${session.user.name || session.user.email} voided B2B ${transaction.transactionType} of Rs ${total.toLocaleString()} for ${customerName} (Bill #${transaction.billSno}).${cylinderSummary ? ` Items: ${cylinderSummary}.` : ''}`,
        link,
        priority: 'HIGH',
        regionId: activityRegionId,
        metadata: {
          domain: 'B2B_TRANSACTION_VOIDED',
          transactionId: transaction.id,
          customerId: transaction.customerId,
          customerName,
          billSno: transaction.billSno,
          totalAmount: total,
          cylinderSummary: cylinderSummary || null,
        },
      });

      const cylinderTypesAffected = transaction.items
        .map((it: any) => it.cylinderVariantKey?.trim() || it.cylinderType)
        .filter(Boolean) as string[];
      if (cylinderTypesAffected.length > 0) {
        await checkAllCylinderTypesForLowStock(cylinderTypesAffected, activityRegionId);
      }
    } catch (sideEffectError) {
      console.error('B2B undo post-commit side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction successfully voided and all changes reversed'
    });
  } catch (error) {
    console.error('Error undoing transaction:', error);
    return NextResponse.json(
      { error: 'Failed to undo transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

