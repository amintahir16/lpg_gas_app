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
    const transaction = await prisma.b2BTransaction.findUnique({
      where: { id: transactionId },
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
          // Reverse: subtract unpaid amount (or full amount if old format)
          const unpaidAmount = transaction.unpaidAmount 
            ? parseFloat(transaction.unpaidAmount.toString())
            : parseFloat(transaction.totalAmount.toString());
          newLedgerBalance -= unpaidAmount;
          
          // Reverse cylinder due counts
          transaction.items.forEach((item: any) => {
            if (item.cylinderType && item.quantity > 0) {
              const quantity = Number(item.quantity);
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
          });
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          // Reverse: add back the amount (these decreased balance)
          newLedgerBalance += parseFloat(transaction.totalAmount.toString());
          break;
        case 'RETURN_EMPTY':
          // Reverse: add back cylinder due counts
          transaction.items.forEach((item: any) => {
            if (item.cylinderType && item.quantity > 0 && item.emptyReturned) {
              const quantity = Number(item.quantity);
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
        // Return cylinders to inventory
        const gasItems = transaction.items.filter((item: any) => item.cylinderType);
        
        for (const item of gasItems) {
          if (item.quantity > 0) {
            const quantity = Number(item.quantity);
            const cylinderType = item.cylinderType;
            
            let mappedCylinderType: CylinderType;
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: continue;
            }

            // Find cylinders that are WITH_CUSTOMER for this customer
            const cylindersWithCustomer = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: CylinderStatus.WITH_CUSTOMER,
                location: { contains: customer.name }
              },
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
              console.log(`Returned ${quantity} ${cylinderType} cylinders to inventory (FULL status)`);
            }
          }
        }

        // Return accessories to inventory
        const accessoryItems = transaction.items.filter((item: any) => !item.cylinderType && item.productId);
        
        if (accessoryItems.length > 0) {
          // For each accessory, increment stock
          for (const item of accessoryItems) {
            if (item.productId && item.quantity > 0) {
              const product = await tx.product.findUnique({
                where: { id: item.productId }
              });

              if (product) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stockQuantity: {
                      increment: Number(item.quantity)
                    }
                  }
                });
                console.log(`Returned ${item.quantity} ${item.productName} to inventory`);
              }
            }
          }

          // Handle special inventory items (stoves, regulators, gas pipes)
          // These are handled by InventoryDeductionService, so we need to reverse them
          // For now, we'll handle them through the Product table if they have productId
          // Otherwise, we'll need to check specialized tables
        }
      } else if (transaction.transactionType === 'BUYBACK' || transaction.transactionType === 'RETURN_EMPTY') {
        // Reverse: Remove cylinders from inventory (they were added back)
        const gasItems = transaction.items.filter((item: any) => item.cylinderType);
        
        for (const item of gasItems) {
          if (item.quantity > 0) {
            const quantity = Number(item.quantity);
            const cylinderType = item.cylinderType;
            
            let mappedCylinderType: CylinderType;
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: continue;
            }

            // Find EMPTY cylinders in store
            const emptyCylinders = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: CylinderStatus.EMPTY,
                location: 'Store - Ready for Refill'
              },
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
              console.log(`Reversed return: ${quantity} ${cylinderType} cylinders back to WITH_CUSTOMER`);
            }
          }
        }
      }
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

