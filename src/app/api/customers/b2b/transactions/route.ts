import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CylinderType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
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

    // Validate and format date/time
    console.log('Received date/time data:', { date, time, dateType: typeof date, timeType: typeof time });
    
    const transactionDate = new Date(date);
    
    // Handle time parsing - if time is just HH:MM, combine with date
    let transactionTime;
    if (time) {
      if (time.includes('T') || time.includes(' ')) {
        // Full datetime string
        transactionTime = new Date(time);
      } else if (time.match(/^\d{1,2}:\d{2}$/)) {
        // Time only (HH:MM) - combine with date
        const [hours, minutes] = time.split(':');
        const combinedDateTime = new Date(date);
        combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        transactionTime = combinedDateTime;
      } else {
        // Try to parse as regular date
        transactionTime = new Date(time);
      }
    } else {
      transactionTime = new Date();
    }
    
    console.log('Parsed dates:', { 
      transactionDate: transactionDate.toISOString(), 
      transactionTime: transactionTime.toISOString(),
      dateValid: !isNaN(transactionDate.getTime()),
      timeValid: !isNaN(transactionTime.getTime())
    });
    
    if (isNaN(transactionDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format', receivedDate: date },
        { status: 400 }
      );
    }
    
    if (isNaN(transactionTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid time format', receivedTime: time },
        { status: 400 }
      );
    }

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
          date: transactionDate,
          time: transactionTime,
          totalAmount: parseFloat(totalAmount),
          paymentReference,
          notes,
          createdBy: session.user.id,
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

            // Create product name with quality for stoves
            let productName = item.name || item.productName || (item.cylinderType ? `${item.cylinderType} Cylinder` : 'Gas Cylinder');
            if (item.name === 'Stove' && item.quality) {
              productName = `Stove ${item.quality}`;
            }

            return {
              transactionId: transaction.id,
              productId: item.productId || null, // B2B customer detail page doesn't send productId
              productName: productName,
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

      let newLedgerBalance = parseFloat(customer.ledgerBalance.toString()) || 0;
      let newDomestic118kgDue = customer.domestic118kgDue || 0;
      let newStandard15kgDue = customer.standard15kgDue || 0;
      let newCommercial454kgDue = customer.commercial454kgDue || 0;
      
      console.log(`Processing transaction type: ${transactionType}, amount: ${totalAmount}`);
      console.log(`Current ledger balance: ${newLedgerBalance}, Type: ${typeof newLedgerBalance}`);
      switch (transactionType) {
        case 'SALE':
          console.log(`SALE transaction: adding ${totalAmount} to ledger balance`);
          newLedgerBalance += parseFloat(totalAmount);
          console.log(`New ledger balance after calculation: ${newLedgerBalance}`);
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
      console.log(`Updating customer ${customerId} ledger balance from ${customer.ledgerBalance} to ${newLedgerBalance}`);
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
      console.log(`Customer ${customerId} ledger balance updated successfully`);

      // Update cylinder inventory for sales (deduction) and returns (addition)
      if (transactionType === 'SALE' && gasItems.length > 0) {
        for (const gasItem of gasItems) {
          if (gasItem.delivered > 0) {
            // Find and update cylinders from inventory
            const cylinderType = gasItem.cylinderType;
            let mappedCylinderType: CylinderType;
            
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: console.log(`Unknown cylinder type: ${cylinderType}`); continue;
            }

            // Find available cylinders of this type
            const availableCylinders = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: 'FULL'
              },
              take: gasItem.delivered
            });

            if (availableCylinders.length < gasItem.delivered) {
              throw new Error(`Insufficient inventory: Only ${availableCylinders.length} ${cylinderType} cylinders available, but ${gasItem.delivered} requested`);
            }

            // Update cylinders to "WITH_CUSTOMER" status
            await tx.cylinder.updateMany({
              where: {
                id: { in: availableCylinders.map(c => c.id) }
              },
              data: {
                currentStatus: 'WITH_CUSTOMER',
                location: `Customer: ${customer.name}`
              }
            });

            console.log(`Deducted ${gasItem.delivered} ${cylinderType} cylinders from inventory`);
          }
        }
      }

      // Update inventory for accessories (only deduction on sales)
      if (transactionType === 'SALE' && accessoryItems.length > 0) {
        for (const accessory of accessoryItems) {
          if (accessory.quantity > 0) {
            if (accessory.name === 'Stove' && accessory.quality) {
              // Handle stove inventory with quality
              const stove = await tx.stove.findFirst({
                where: { quality: accessory.quality }
              });
              
              if (stove) {
                await tx.stove.update({
                  where: { id: stove.id },
                  data: {
                    quantity: {
                      decrement: accessory.quantity
                    },
                    totalCost: {
                      decrement: accessory.quantity * stove.costPerPiece
                    }
                  }
                });
                console.log(`Deducted ${accessory.quantity} ${accessory.quality} stoves from inventory`);
              }
            } else {
              // Handle other accessories (regulators, gas pipes, etc.)
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
                console.log(`Deducted ${accessory.quantity} ${accessory.name} from inventory`);
              }
            }
          }
        }
      }

      // Update inventory for returned cylinders (add back to stock)
      if ((transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && gasItems.length > 0) {
        for (const gasItem of gasItems) {
          if (gasItem.emptyReturned > 0) {
            const quantity = parseInt(gasItem.emptyReturned);
            const cylinderType = gasItem.cylinderType;
            
            if (quantity > 0 && cylinderType) {
              let mappedCylinderType: CylinderType;
              switch (cylinderType) {
                case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
                case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
                case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
                default: console.log(`Unknown cylinder type: ${cylinderType}`); continue;
              }

              // Find cylinders that are currently with this customer
              const cylindersWithCustomer = await tx.cylinder.findMany({
                where: {
                  cylinderType: mappedCylinderType,
                  currentStatus: 'WITH_CUSTOMER',
                  location: { contains: customer.name }
                },
                take: quantity
              });

              if (cylindersWithCustomer.length >= quantity) {
                // Update existing cylinders to EMPTY status
                await tx.cylinder.updateMany({
                  where: {
                    id: { in: cylindersWithCustomer.slice(0, quantity).map(c => c.id) }
                  },
                  data: {
                    currentStatus: 'EMPTY',
                    location: 'Store - Ready for Refill'
                  }
                });
                console.log(`Updated ${quantity} ${cylinderType} cylinders to EMPTY status in inventory`);
              } else {
                // If not enough cylinders found with customer, create new ones
                const cylindersToCreate = quantity - cylindersWithCustomer.length;
                if (cylindersWithCustomer.length > 0) {
                  await tx.cylinder.updateMany({
                    where: {
                      id: { in: cylindersWithCustomer.map(c => c.id) }
                    },
                    data: {
                      currentStatus: 'EMPTY',
                      location: 'Store - Ready for Refill'
                    }
                  });
                }

                // Create new cylinders for the remaining quantity
                const initialCylinderCount = await tx.cylinder.count();
                for (let i = 0; i < cylindersToCreate; i++) {
                  const code = `CYL${String(initialCylinderCount + 1 + i).padStart(3, '0')}`;
                  await tx.cylinder.create({
                    data: {
                      code,
                      cylinderType: mappedCylinderType,
                      capacity: cylinderType === 'DOMESTIC_11_8KG' ? 11.8 : cylinderType === 'STANDARD_15KG' ? 15.0 : 45.4,
                      currentStatus: 'EMPTY',
                      location: 'Store - Ready for Refill',
                    },
                  });
                }
                console.log(`Added ${quantity} empty ${cylinderType} cylinders to inventory (${cylindersWithCustomer.length} updated, ${cylindersToCreate} created)`);
              }
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
