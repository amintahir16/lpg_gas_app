import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { InventoryDeductionService } from '@/lib/inventory-deduction';
import { prisma } from '@/lib/db';
import { CylinderStatus } from '@prisma/client';
import { getCapacityFromTypeString } from '@/lib/cylinder-utils';

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
      paidAmount,              // Amount paid at sale time (for SALE transactions)
      paymentMethod,           // Payment method if paid at sale
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

    // Calculate payment status and unpaid amount for SALE transactions
    let paidAmountValue: number | null = null;
    let unpaidAmountValue: number | null = null;
    let paymentStatus: string | null = null;
    
    if (transactionType === 'SALE' && paidAmount !== undefined) {
      const total = parseFloat(totalAmount);
      const paid = parseFloat(paidAmount) || 0;
      
      paidAmountValue = paid;
      unpaidAmountValue = Math.max(0, total - paid);
      
      // Determine payment status
      if (paid <= 0) {
        paymentStatus = 'UNPAID';
      } else if (paid >= total - 0.01) { // Allow small floating point tolerance
        paymentStatus = 'FULLY_PAID';
      } else {
        paymentStatus = 'PARTIAL';
      }
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Generate per-customer bill sequence number (1, 2, 3... for each customer)
      // Find the max existing bill number for this customer and use max + 1
      const existingTransactions = await tx.b2BTransaction.findMany({
        where: { customerId },
        select: { billSno: true },
        orderBy: { createdAt: 'desc' }
      });
      
      // Find the highest numeric bill number
      let maxBillNo = 0;
      for (const t of existingTransactions) {
        const num = parseInt(t.billSno, 10);
        if (!isNaN(num) && num > maxBillNo) {
          maxBillNo = num;
        }
      }
      
      // Next bill number is max + 1
      const nextBillNo = maxBillNo + 1;
      const billSno = String(nextBillNo);
      
      // Update customer's billSequence to keep it in sync
      await tx.customer.update({
        where: { id: customerId },
        data: { billSequence: nextBillNo }
      });

      // Create the transaction
      const transaction = await tx.b2BTransaction.create({
        data: {
          transactionType: transactionType as any,
          billSno,
          customerId,
          date: transactionDate,
          time: transactionTime,
          totalAmount: parseFloat(totalAmount),
          ...(paidAmountValue !== null && { paidAmount: paidAmountValue }),
          ...(unpaidAmountValue !== null && { unpaidAmount: unpaidAmountValue }),
          ...(transactionType === 'SALE' && paymentMethod && { paymentMethod: paymentMethod as any }),
          ...(transactionType === 'SALE' && paymentStatus && { paymentStatus: paymentStatus as any }),
          paymentReference: paymentReference || null,
          notes: notes || null,
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
            // Calculate buyback amounts if:
            // 1. It's a BUYBACK transaction type, OR
            // 2. Item is marked as buyback (isBuyback: true), OR
            // 3. Item has remainingKg > 0 (indicating it's a buyback item in unified transaction)
            let buybackAmount = 0;
            let buybackTotal = 0;
            const buybackRate = item.buybackRate || 0.6; // Use provided rate or default to 60%
            const isBuybackItem = transactionType === 'BUYBACK' || item.isBuyback === true || (item.remainingKg && item.remainingKg > 0);
            
            if (isBuybackItem && item.remainingKg > 0 && item.originalSoldPrice > 0) {
              // Get capacity dynamically from cylinder type - fully flexible
              const totalKg = getCapacityFromTypeString(item.cylinderType);
              const remainingPercentage = item.remainingKg / totalKg;
              buybackAmount = item.originalSoldPrice * remainingPercentage * buybackRate;
              buybackTotal = buybackAmount * (item.emptyReturned || 1);
            }
            
            // Use pre-calculated buyback total from frontend if available
            if (item.buybackTotal && item.buybackTotal > 0) {
              buybackTotal = item.buybackTotal;
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
              totalPrice: isBuybackItem && buybackTotal > 0 ? buybackTotal : parseFloat(String((item.delivered || item.quantity || 0) * (item.pricePerItem || 0))),
              cylinderType: item.cylinderType,
              returnedCondition: item.returnedCondition || (item.emptyReturned > 0 ? 'EMPTY' : null),
              // Only store remainingKg for actual buyback items (not empty returns)
              remainingKg: isBuybackItem && item.remainingKg > 0 ? parseFloat(item.remainingKg) : null,
              originalSoldPrice: isBuybackItem && item.originalSoldPrice > 0 ? parseFloat(item.originalSoldPrice) : null,
              // Only store buyback rate for actual buyback items
              buybackRate: isBuybackItem && item.remainingKg > 0 ? buybackRate : null,
              buybackPricePerItem: isBuybackItem && buybackAmount > 0 ? buybackAmount : null,
              buybackTotal: isBuybackItem && buybackTotal > 0 ? buybackTotal : null,
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
      
      // Check if this is a unified transaction with buyback credit
      const isUnifiedTransaction = body.isUnifiedTransaction === true;
      const unifiedSummary = body.unifiedSummary;
      
      // Calculate total buyback credit from return items
      let totalBuybackCredit = 0;
      if (isUnifiedTransaction && unifiedSummary) {
        totalBuybackCredit = unifiedSummary.buybackCredit || 0;
      } else {
        // Legacy: calculate from gasItems
        totalBuybackCredit = gasItems.reduce((sum: number, item: any) => sum + (item.buybackTotal || 0), 0);
      }
      
      switch (transactionType) {
        case 'SALE':
          // For SALE transactions, calculate net amount including buyback credit
          const saleAmount = parseFloat(totalAmount);
          const buybackCreditAmount = totalBuybackCredit;
          
          // Net sale amount = sale total - buyback credit
          const netSaleAmount = saleAmount - buybackCreditAmount;
          
          // Unpaid = net amount - payment received
          const unpaid = unpaidAmountValue !== null 
            ? Math.max(0, netSaleAmount - (paidAmountValue || 0))
            : netSaleAmount;
          
          console.log(`SALE transaction: total=${saleAmount}, buybackCredit=${buybackCreditAmount}, netSale=${netSaleAmount}`);
          console.log(`SALE transaction: paid=${paidAmountValue || 0}, unpaid=${unpaid}`);
          console.log(`SALE transaction: adding unpaid amount ${unpaid} to ledger balance`);
          
          // For unified transactions, use the balance impact directly if available
          if (isUnifiedTransaction && unifiedSummary && unifiedSummary.balanceImpact !== undefined) {
            newLedgerBalance += unifiedSummary.balanceImpact;
            console.log(`Using unified balance impact: ${unifiedSummary.balanceImpact}`);
          } else {
            newLedgerBalance += unpaid;
          }
          
          console.log(`New ledger balance after calculation: ${newLedgerBalance}`);
          
          // Update cylinder due counts for sales - ONLY if delivered > 0
          gasItems.forEach((item: any) => {
            if (item.delivered > 0) {
              console.log(`Processing cylinder sale: ${item.cylinderType} - ${item.delivered} delivered`);
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
            } else {
              console.log(`Skipping cylinder: ${item.cylinderType} - delivered: ${item.delivered} (not delivered)`);
            }
            // Handle returns within the same transaction (unified transaction)
            if (item.emptyReturned > 0) {
              console.log(`Processing cylinder return: ${item.cylinderType} - ${item.emptyReturned} returned`);
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
          // PAYMENT transactions decrease what customer owes
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
          updatedBy: session.user.id,
        },
      });
      console.log(`Customer ${customerId} ledger balance updated successfully`);

      // Update cylinder inventory for sales (deduction) and returns (addition)
      if (transactionType === 'SALE' && gasItems.length > 0) {
        console.log(`Processing ${gasItems.length} gas items for inventory update`);
        for (const gasItem of gasItems) {
          console.log(`Gas item: ${gasItem.cylinderType}, delivered: ${gasItem.delivered}, emptyReturned: ${gasItem.emptyReturned}`);
          if (gasItem.delivered > 0) {
            // Find and update cylinders from inventory
            const cylinderType = gasItem.cylinderType; // Use string directly

            // Find available cylinders of this type
            const availableCylinders = await tx.cylinder.findMany({
              where: {
                cylinderType: cylinderType, // Filter by string type
                currentStatus: CylinderStatus.FULL
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
                currentStatus: CylinderStatus.WITH_CUSTOMER,
                location: `Customer: ${customer.name || 'Unknown'}`
              }
            });

            console.log(`Deducted ${gasItem.delivered} ${cylinderType} cylinders from inventory`);
          }
        }
      }

      // Update inventory for accessories using professional deduction service
      if (transactionType === 'SALE' && accessoryItems.length > 0) {
        console.log('🔄 Processing accessories inventory deduction...');
        
        // Convert accessory items to the format expected by InventoryDeductionService
        const accessorySaleItems = accessoryItems
          .filter((item: any) => item.quantity > 0)
          .map((item: any) => ({
            category: item.productName.split(' - ')[0] || item.name || 'Unknown',
            itemType: item.productName.split(' - ')[1] || item.name || 'Unknown',
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            totalPrice: item.totalPrice,
            // Vaporizer-specific fields
            isVaporizer: item.isVaporizer || false,
            usagePrice: item.usagePrice || 0,
            sellingPrice: item.sellingPrice || 0,
            costPerPiece: item.costPerPiece || 0
          }));
        
        if (accessorySaleItems.length > 0) {
          // Log vaporizer pricing information
          const vaporizerItems = accessorySaleItems.filter((item: any) => item.isVaporizer);
          if (vaporizerItems.length > 0) {
            console.log('🌫️ Processing vaporizer items:');
            vaporizerItems.forEach((item: any) => {
            console.log(`  - ${item.category} - ${item.itemType}: ${item.quantity} units`);
            console.log(`    Usage Price: ${item.usagePrice}`);
            console.log(`    Selling Price: ${item.sellingPrice}`);
            console.log(`    Cost Per Piece: ${item.costPerPiece}`);
            console.log(`    Total Price: ${item.totalPrice}`);
            });
          }
          
          // Validate inventory availability first
          const validation = await InventoryDeductionService.validateInventoryAvailability(accessorySaleItems);
          if (!validation.isValid) {
            throw new Error(`Inventory validation failed: ${validation.errors.join(', ')}`);
          }
          
          // Deduct from inventory
          await InventoryDeductionService.deductAccessoriesFromInventory(accessorySaleItems);
          console.log('✅ Accessories inventory deduction completed successfully');
        }
      }

      // Update inventory for returned cylinders (add back to stock)
      // Now also handles returns within SALE transactions (unified transactions)
      const hasReturns = gasItems.some((item: any) => item.emptyReturned > 0);
      if ((transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY' || (transactionType === 'SALE' && hasReturns)) && gasItems.length > 0) {
        console.log('🔄 Processing returned cylinders for inventory...');
        for (const gasItem of gasItems) {
          if (gasItem.emptyReturned > 0) {
            const quantity = parseInt(gasItem.emptyReturned);
            const cylinderType = gasItem.cylinderType;
            
            if (quantity > 0 && cylinderType) {
              console.log(`Processing return: ${quantity} x ${cylinderType}`);
              
              // Find cylinders that are currently with this customer
              const cylindersWithCustomer = await tx.cylinder.findMany({
                where: {
                  cylinderType: cylinderType, // Filter by string type
                  currentStatus: CylinderStatus.WITH_CUSTOMER,
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
                    currentStatus: CylinderStatus.EMPTY,
                    location: 'Store - Ready for Refill'
                  }
                });
                console.log(`✅ Updated ${quantity} ${cylinderType} cylinders to EMPTY status in inventory`);
              } else {
                // If not enough cylinders found with customer, create new ones
                const cylindersToCreate = quantity - cylindersWithCustomer.length;
                if (cylindersWithCustomer.length > 0) {
                  await tx.cylinder.updateMany({
                    where: {
                      id: { in: cylindersWithCustomer.map(c => c.id) }
                    },
                    data: {
                      currentStatus: CylinderStatus.EMPTY,
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
                      cylinderType: cylinderType, // Use string type directly
                      capacity: getCapacityFromTypeString(cylinderType),
                      currentStatus: CylinderStatus.EMPTY,
                      location: 'Store - Ready for Refill',
                    },
                  });
                }
                console.log(`✅ Added ${quantity} empty ${cylinderType} cylinders to inventory (${cylindersWithCustomer.length} updated, ${cylindersToCreate} created)`);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to create B2B transaction',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
