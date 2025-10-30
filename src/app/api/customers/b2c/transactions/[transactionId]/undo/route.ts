import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CylinderType, CylinderStatus } from '@prisma/client';
import { InventoryDeductionService } from '@/lib/inventory-deduction';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Get the transaction with all details
    const transaction = await prisma.b2CTransaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        gasItems: true,
        securityItems: true,
        accessoryItems: true
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
      await tx.b2CTransaction.update({
        where: { id: transactionId },
        data: {
          voided: true,
          voidedBy: session.user.id,
          voidedAt: new Date(),
          voidReason: reason || 'Transaction reversed by admin'
        }
      });

      // 2. Reverse customer profit
      const customer = await tx.b2CCustomer.findUnique({
        where: { id: transaction.customerId }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Subtract the actual profit from customer
      const newTotalProfit = Math.max(0, parseFloat(customer.totalProfit.toString()) - parseFloat(transaction.actualProfit.toString()));
      
      await tx.b2CCustomer.update({
        where: { id: transaction.customerId },
        data: {
          totalProfit: newTotalProfit
        }
      });

      // 3. Reverse security items (cylinder holdings)
      if (transaction.securityItems && transaction.securityItems.length > 0) {
        for (const item of transaction.securityItems) {
          if (!item.isReturn) {
            // Security deposit was made - need to reverse:
            // - Return cylinders from WITH_CUSTOMER back to FULL
            // - Delete cylinder holding records
            
            const cylinderType = item.cylinderType;
            let mappedCylinderType: CylinderType;
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: continue;
            }

            const quantity = Number(item.quantity);

            // Find cylinders that are WITH_CUSTOMER for this customer
            // Location format is "B2C Customer: {customer.name}"
            const cylindersWithCustomer = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: CylinderStatus.WITH_CUSTOMER,
                location: { contains: `B2C Customer: ${customer.name}` }
              },
              orderBy: { updatedAt: 'desc' }, // Most recently updated first
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
              console.log(`✅ Reversed security deposit: Returned ${quantity} ${cylinderType} cylinders to inventory (FULL status)`);
            } else {
              console.warn(`⚠️ Warning: Could not find ${quantity} ${cylinderType} cylinders with customer ${customer.name}. Found: ${cylindersWithCustomer.length}`);
            }

            // Delete cylinder holding records for this transaction
            // Match by customer, cylinder type, and issue date (transaction date)
            const deletedHoldings = await tx.b2CCylinderHolding.deleteMany({
              where: {
                customerId: transaction.customerId,
                cylinderType: item.cylinderType,
                issueDate: transaction.date,
                isReturned: false
              }
            });
            console.log(`✅ Deleted ${deletedHoldings.count} cylinder holding record(s) for ${cylinderType}`);
          } else {
            // Security return - need to reverse:
            // - Mark holdings as not returned
            // - Return cylinders from EMPTY back to WITH_CUSTOMER (or mark holdings as active)
            
            const cylinderType = item.cylinderType;
            let mappedCylinderType: CylinderType;
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: continue;
            }

            const quantity = Number(item.quantity);

            // Find returned holdings and mark them as not returned
            // Match by customer, cylinder type, isReturned=true, and returnDate within same day as transaction
            const transactionDate = new Date(transaction.date);
            const transactionDateStart = new Date(transactionDate);
            transactionDateStart.setHours(0, 0, 0, 0);
            const transactionDateEnd = new Date(transactionDate);
            transactionDateEnd.setHours(23, 59, 59, 999);
            
            const returnedHoldings = await tx.b2CCylinderHolding.findMany({
              where: {
                customerId: transaction.customerId,
                cylinderType: item.cylinderType,
                isReturned: true,
                returnDate: {
                  gte: transactionDateStart,
                  lte: transactionDateEnd
                }
              },
              orderBy: { issueDate: 'asc' },
              take: quantity
            });

            for (const holding of returnedHoldings) {
              await tx.b2CCylinderHolding.update({
                where: { id: holding.id },
                data: {
                  isReturned: false,
                  returnDate: null,
                  returnDeduction: 0
                }
              });
            }

            // Find EMPTY cylinders that were returned and put them back WITH_CUSTOMER
            // Note: Some cylinders may have been newly created during the return, so we need to
            // prioritize most recently updated cylinders (likely from this transaction)
            const emptyCylinders = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: CylinderStatus.EMPTY,
                location: 'Store - Ready for Refill'
              },
              orderBy: { updatedAt: 'desc' }, // Most recent first
              take: quantity
            });

            if (emptyCylinders.length >= quantity) {
              await tx.cylinder.updateMany({
                where: {
                  id: { in: emptyCylinders.slice(0, quantity).map(c => c.id) }
                },
                data: {
                  currentStatus: CylinderStatus.WITH_CUSTOMER,
                  location: `B2C Customer: ${customer.name}`
                }
              });
              console.log(`✅ Reversed security return: ${quantity} ${cylinderType} cylinders back to WITH_CUSTOMER`);
            } else if (emptyCylinders.length > 0) {
              // Update what we found and warn
              await tx.cylinder.updateMany({
                where: {
                  id: { in: emptyCylinders.map(c => c.id) }
                },
                data: {
                  currentStatus: CylinderStatus.WITH_CUSTOMER,
                  location: `B2C Customer: ${customer.name}`
                }
              });
              console.warn(`⚠️ Warning: Only found ${emptyCylinders.length} of ${quantity} empty ${cylinderType} cylinders to reverse. Some may have been newly created during the transaction.`);
            } else {
              console.warn(`⚠️ Warning: Could not find any empty ${cylinderType} cylinders to reverse return for ${customer.name}`);
            }
          }
        }
      }

      // 4. Reverse accessory items - return to inventory
      // B2C uses InventoryDeductionService which uses CustomItem table (same as B2B)
      if (transaction.accessoryItems && transaction.accessoryItems.length > 0) {
        for (const item of transaction.accessoryItems) {
          if (item.quantity <= 0) continue;
          
          const quantity = Number(item.quantity);
          const productName = item.productName || '';
          
          // Parse category and itemType from productName (format: "Category - ItemType")
          const parts = productName.split(' - ');
          const category = parts[0] || '';
          const itemType = parts[1] || category; // Fallback to category if no separator
          
          console.log(`Reversing accessory: ${category} - ${itemType}, quantity: ${quantity}`);
          
          // Try to find in CustomItem table (used by InventoryDeductionService)
          const customItem = await tx.customItem.findFirst({
            where: {
              name: category,
              type: itemType,
              isActive: true
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
            // Try Product table as fallback (for items not using CustomItem)
            const products = await tx.product.findMany({
              where: {
                OR: [
                  { name: { contains: category, mode: 'insensitive' } },
                  { name: { contains: productName, mode: 'insensitive' } }
                ]
              }
            });

            if (products.length > 0) {
              // Increment stock for the first matching product
              await tx.product.update({
                where: { id: products[0].id },
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
          }
        }
      }

      // Note: Gas items don't affect inventory (they're just refills), so nothing to reverse there
    });

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

