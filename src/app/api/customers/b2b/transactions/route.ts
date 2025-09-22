import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      transactionType,
      customerId,
      date,
      time,
      totalAmount,
      paymentReference,
      notes,
      gasItems = [],
      accessoryItems = []
    } = body;

    // Generate bill sequence number
    const today = new Date().toISOString().split('T')[0];
    const billSequence = await prisma.billSequence.upsert({
      where: { date: new Date(today) },
      update: { sequence: { increment: 1 } },
      create: { date: new Date(today), sequence: 1 },
    });

    const billSno = `B2B${today.replace(/-/g, '')}${String(billSequence.sequence).padStart(4, '0')}`;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.b2BTransaction.create({
        data: {
          transactionType: transactionType as any,
          billSno,
          customerId,
          date: new Date(date),
          time: new Date(time),
          totalAmount: parseFloat(totalAmount),
          paymentReference,
          notes,
          createdBy: userId,
        },
      });

      // Create transaction items
      const allItems = [...gasItems, ...accessoryItems].filter(item => 
        (item.delivered && item.delivered > 0) || 
        (item.quantity && item.quantity > 0) ||
        (item.emptyReturned && item.emptyReturned > 0)
      );

      if (allItems.length > 0) {
        await tx.b2BTransactionItem.createMany({
          data: allItems.map((item: any) => {
            // Calculate buyback amounts if it's a buyback transaction
            let buybackAmount = 0;
            let buybackTotal = 0;
            if (transactionType === 'BUYBACK' && item.remainingKg > 0 && item.originalSoldPrice > 0) {
              const totalKg = item.cylinderType === 'DOMESTIC_11_8KG' ? 11.8 :
                             item.cylinderType === 'STANDARD_15KG' ? 15 : 45.4;
              const remainingPercentage = item.remainingKg / totalKg;
              buybackAmount = item.originalSoldPrice * remainingPercentage * 0.6; // 60% buyback rate
              buybackTotal = buybackAmount * (item.emptyReturned || 0);
            }

            return {
              transactionId: transaction.id,
              productId: item.productId,
              productName: item.name || item.productName || 'Gas Cylinder',
              quantity: parseFloat(item.delivered || item.quantity || item.emptyReturned || 0),
              pricePerItem: parseFloat(item.pricePerItem || 0),
              totalPrice: transactionType === 'BUYBACK' ? buybackTotal : parseFloat((item.delivered || item.quantity || 0) * (item.pricePerItem || 0)),
              cylinderType: item.cylinderType,
              returnedCondition: item.returnedCondition || (item.emptyReturned > 0 ? 'EMPTY' : null),
              remainingKg: item.remainingKg ? parseFloat(item.remainingKg) : null,
              originalSoldPrice: item.originalSoldPrice ? parseFloat(item.originalSoldPrice) : null,
              buybackRate: transactionType === 'BUYBACK' ? 0.6 : null,
              buybackPricePerItem: transactionType === 'BUYBACK' ? buybackAmount : null,
              buybackTotal: transactionType === 'BUYBACK' ? buybackTotal : null,
            };
          }),
        });
      }

      // Update customer ledger balance and cylinder due counts
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      let newLedgerBalance = customer.ledgerBalance || 0;
      let newDomestic118kgDue = customer.domestic118kgDue || 0;
      let newStandard15kgDue = customer.standard15kgDue || 0;
      let newCommercial454kgDue = customer.commercial454kgDue || 0;
      
      switch (transactionType) {
        case 'SALE':
          newLedgerBalance += parseFloat(totalAmount);
          // Update cylinder due counts for sales
          gasItems.forEach((item: any) => {
            if (item.delivered > 0) {
              switch (item.cylinderType) {
                case 'DOMESTIC_11_8KG':
                  newDomestic118kgDue += item.delivered;
                  break;
                case 'STANDARD_15KG':
                  newStandard15kgDue += item.delivered;
                  break;
                case 'COMMERCIAL_45_4KG':
                  newCommercial454kgDue += item.delivered;
                  break;
              }
            }
            if (item.emptyReturned > 0) {
              switch (item.cylinderType) {
                case 'DOMESTIC_11_8KG':
                  newDomestic118kgDue = Math.max(0, newDomestic118kgDue - item.emptyReturned);
                  break;
                case 'STANDARD_15KG':
                  newStandard15kgDue = Math.max(0, newStandard15kgDue - item.emptyReturned);
                  break;
                case 'COMMERCIAL_45_4KG':
                  newCommercial454kgDue = Math.max(0, newCommercial454kgDue - item.emptyReturned);
                  break;
              }
            }
          });
          break;
        case 'PAYMENT':
          newLedgerBalance -= parseFloat(totalAmount);
          break;
        case 'BUYBACK':
          newLedgerBalance -= parseFloat(totalAmount);
          // Update cylinder due counts for buybacks
          gasItems.forEach((item: any) => {
            if (item.emptyReturned > 0) {
              switch (item.cylinderType) {
                case 'DOMESTIC_11_8KG':
                  newDomestic118kgDue = Math.max(0, newDomestic118kgDue - item.emptyReturned);
                  break;
                case 'STANDARD_15KG':
                  newStandard15kgDue = Math.max(0, newStandard15kgDue - item.emptyReturned);
                  break;
                case 'COMMERCIAL_45_4KG':
                  newCommercial454kgDue = Math.max(0, newCommercial454kgDue - item.emptyReturned);
                  break;
              }
            }
          });
          break;
        case 'RETURN_EMPTY':
          // Update cylinder due counts for empty returns
          gasItems.forEach((item: any) => {
            if (item.emptyReturned > 0) {
              switch (item.cylinderType) {
                case 'DOMESTIC_11_8KG':
                  newDomestic118kgDue = Math.max(0, newDomestic118kgDue - item.emptyReturned);
                  break;
                case 'STANDARD_15KG':
                  newStandard15kgDue = Math.max(0, newStandard15kgDue - item.emptyReturned);
                  break;
                case 'COMMERCIAL_45_4KG':
                  newCommercial454kgDue = Math.max(0, newCommercial454kgDue - item.emptyReturned);
                  break;
              }
            }
          });
          break;
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          newLedgerBalance -= parseFloat(totalAmount);
          break;
      }

      // Update customer
      await tx.customer.update({
        where: { id: customerId },
        data: {
          ledgerBalance: newLedgerBalance,
          domestic118kgDue: newDomestic118kgDue,
          standard15kgDue: newStandard15kgDue,
          commercial454kgDue: newCommercial454kgDue,
          updatedBy: userId,
        },
      });

      // Update inventory for accessories
      if (transactionType === 'SALE' && accessoryItems.length > 0) {
        for (const accessory of accessoryItems) {
          if (accessory.quantity > 0) {
            const product = await tx.product.findFirst({
              where: { name: accessory.name }
            });
            
            if (product) {
              await tx.product.update({
                where: { id: product.id },
                data: {
                  stockQuantity: {
                    decrement: accessory.quantity
                  }
                }
              });
            }
          }
        }
      }

      // Update inventory for returned cylinders (add back to stock)
      if ((transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && gasItems.length > 0) {
        for (const gasItem of gasItems) {
          if (gasItem.emptyReturned > 0) {
            // Find the corresponding cylinder product
            const cylinderProduct = await tx.product.findFirst({
              where: { 
                name: {
                  contains: gasItem.cylinderType === 'DOMESTIC_11_8KG' ? '11.8kg' :
                          gasItem.cylinderType === 'STANDARD_15KG' ? '15kg' : '45.4kg'
                }
              }
            });
            
            if (cylinderProduct) {
              await tx.product.update({
                where: { id: cylinderProduct.id },
                data: {
                  stockQuantity: {
                    increment: gasItem.emptyReturned
                  }
                }
              });
            }
          }
        }
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating B2B transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create B2B transaction' },
      { status: 500 }
    );
  }
}
