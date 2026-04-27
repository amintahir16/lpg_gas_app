import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CylinderType, CylinderStatus } from '@prisma/client';
import { InventoryDeductionService } from '@/lib/inventory-deduction';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import {
  notifyUserActivity,
  checkAllCylinderTypesForLowStock,
} from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

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
      let newDomestic118kgDue = customer.domestic118kgDue || 0;
      let newStandard15kgDue = customer.standard15kgDue || 0;
      let newCommercial454kgDue = customer.commercial454kgDue || 0;

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

          // Reverse cylinder due counts
          // In SALE transactions, items can be:
          // 1. Delivered cylinders (increases due) - has cylinderType, NO returnedCondition
          // 2. Returned cylinders (decreases due) - has cylinderType AND returnedCondition = 'EMPTY'
          transaction.items.forEach((item: any) => {
            if (item.cylinderType && item.quantity > 0) {
              const quantity = Number(item.quantity);

              if (item.returnedCondition === 'EMPTY') {
                // This was a returned cylinder - it DECREASED due, so we ADD it back
                switch (item.cylinderType) {
                  case 'DOMESTIC_11_8KG':
                    newDomestic118kgDue += quantity;
                    break;
                  case 'STANDARD_15KG':
                    newStandard15kgDue += quantity;
                    break;
                  case 'COMMERCIAL_45_4KG':
                    newCommercial454kgDue += quantity;
                    break;
                }
              } else {
                // This was a delivered cylinder - it INCREASED due, so we SUBTRACT it
                switch (item.cylinderType) {
                  case 'DOMESTIC_11_8KG':
                    newDomestic118kgDue = Math.max(0, newDomestic118kgDue - quantity);
                    break;
                  case 'STANDARD_15KG':
                    newStandard15kgDue = Math.max(0, newStandard15kgDue - quantity);
                    break;
                  case 'COMMERCIAL_45_4KG':
                    newCommercial454kgDue = Math.max(0, newCommercial454kgDue - quantity);
                    break;
                }
              }
            }
          });
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
          // Reverse cylinder due counts - buyback DECREASED them, so we need to INCREASE them back
          transaction.items.forEach((item: any) => {
            if (item.cylinderType && item.quantity > 0) {
              // For BUYBACK, quantity is the emptyReturned amount
              const returnedQuantity = Number(item.quantity);
              switch (item.cylinderType) {
                case 'DOMESTIC_11_8KG':
                  newDomestic118kgDue += returnedQuantity;
                  break;
                case 'STANDARD_15KG':
                  newStandard15kgDue += returnedQuantity;
                  break;
                case 'COMMERCIAL_45_4KG':
                  newCommercial454kgDue += returnedQuantity;
                  break;
              }
            }
          });
          break;
        case 'RETURN_EMPTY':
          // Reverse: add back cylinder due counts
          transaction.items.forEach((item: any) => {
            if (item.cylinderType && item.quantity > 0) {
              // For RETURN_EMPTY, quantity is the emptyReturned amount
              const returnedQuantity = Number(item.quantity);
              switch (item.cylinderType) {
                case 'DOMESTIC_11_8KG':
                  newDomestic118kgDue += returnedQuantity;
                  break;
                case 'STANDARD_15KG':
                  newStandard15kgDue += returnedQuantity;
                  break;
                case 'COMMERCIAL_45_4KG':
                  newCommercial454kgDue += returnedQuantity;
                  break;
              }
            }
          });
          break;
      }

      // Update customer balance
      await tx.customer.update({
        where: { id: transaction.customerId },
        data: {
          ledgerBalance: newLedgerBalance,
          domestic118kgDue: newDomestic118kgDue,
          standard15kgDue: newStandard15kgDue,
          commercial454kgDue: newCommercial454kgDue,
          updatedBy: session.user.id
        }
      });

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

          // Find cylinders that are WITH_CUSTOMER for this customer (region-scoped)
          const cylindersWithCustomer = await tx.cylinder.findMany({
            where: {
              cylinderType: cylinderType,
              currentStatus: CylinderStatus.WITH_CUSTOMER,
              location: { contains: customer.name },
              ...regionScopedWhere(regionId),
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

          // Find EMPTY cylinders in store (region-scoped)
          const emptyCylinders = await tx.cylinder.findMany({
            where: {
              cylinderType: cylinderType,
              currentStatus: CylinderStatus.EMPTY,
              location: 'Store - Ready for Refill',
              ...regionScopedWhere(regionId),
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
                ...regionScopedWhere(regionId),
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
                  where: { id: item.productId, ...regionScopedWhere(regionId) }
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
                    ...regionScopedWhere(regionId),
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

          // Find EMPTY cylinders in store (region-scoped, most recent first)
          const emptyCylinders = await tx.cylinder.findMany({
            where: {
              cylinderType: cylinderType,
              currentStatus: CylinderStatus.EMPTY,
              location: 'Store - Ready for Refill',
              ...regionScopedWhere(regionId),
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
    });

    // ---- Post-commit side effects ----
    try {
      const customerName = transaction.customer?.name || 'Customer';
      const total = parseFloat(transaction.totalAmount.toString());
      const link = `/customers/b2b/${transaction.customerId}?tx=${transaction.id}`;

      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2B_TRANSACTION_VOIDED,
        entityType: 'B2B_TRANSACTION',
        entityId: transaction.id,
        details: `Voided B2B ${transaction.transactionType} • Customer: ${customerName} • Bill #: ${transaction.billSno} • Total: Rs ${total.toLocaleString()}${reason ? ` • Reason: ${reason}` : ''}`,
        link,
        metadata: {
          customerId: transaction.customerId,
          customerName,
          billSno: transaction.billSno,
          transactionType: transaction.transactionType,
          totalAmount: total,
          reason: reason || null,
        },
      });

      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: `B2B ${transaction.transactionType} transaction voided`,
        message: `${session.user.name || session.user.email} voided B2B ${transaction.transactionType} of Rs ${total.toLocaleString()} for ${customerName} (Bill #${transaction.billSno}).`,
        link,
        priority: 'HIGH',
        regionId,
        metadata: {
          domain: 'B2B_TRANSACTION_VOIDED',
          transactionId: transaction.id,
          customerId: transaction.customerId,
          customerName,
          billSno: transaction.billSno,
          totalAmount: total,
        },
      });

      const cylinderTypesAffected = transaction.items
        .map((it: any) => it.cylinderType)
        .filter(Boolean) as string[];
      if (cylinderTypesAffected.length > 0) {
        await checkAllCylinderTypesForLowStock(cylinderTypesAffected, regionId);
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

