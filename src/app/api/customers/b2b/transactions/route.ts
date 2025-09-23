import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CylinderType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    console.log('Received userId from headers:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user exists in database
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!user) {
      console.log('User not found in database:', userId);
      console.log('Looking for any admin user to use instead...');
      
      // If user not found, try to find any admin user
      user = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, email: true }
      });
      
      if (!user) {
        console.log('No admin users found in database');
        return NextResponse.json({ error: 'No valid user found' }, { status: 401 });
      }
      
      console.log('Using admin user instead:', user);
    } else {
      console.log('User found:', user);
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
          createdBy: user.id,
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
              productId: item.productId || null, // B2B customer detail page doesn't send productId
              productName: item.name || item.productName || (item.cylinderType ? `${item.cylinderType} Cylinder` : 'Gas Cylinder'),
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
            // For B2B customer detail page, we need to add cylinders to the Cylinder table
            // instead of updating Product stock
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

              const initialCylinderCount = await tx.cylinder.count();
              for (let i = 0; i < quantity; i++) {
                const code = `CYL${String(initialCylinderCount + 1 + i).padStart(3, '0')}`;
                await tx.cylinder.create({
                  data: {
                    code,
                    cylinderType: mappedCylinderType,
                    capacity: cylinderType === 'DOMESTIC_11_8KG' ? 11.8 : cylinderType === 'STANDARD_15KG' ? 15.0 : 45.4,
                    currentStatus: 'EMPTY',
                    location: 'Returned from Customer',
                  },
                });
              }
              console.log(`Added ${quantity} empty ${cylinderType} cylinders to inventory`);
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
