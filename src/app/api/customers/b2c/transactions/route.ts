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
      customerId,
      date,
      time,
      deliveryCharges = 0,
      deliveryCost = 0,
      paymentMethod = 'CASH',
      notes,
      gasItems = [],
      securityItems = [],
      accessoryItems = []
    } = body;

    // Validate required fields
    if (!customerId || (!gasItems.length && !securityItems.length && !accessoryItems.length)) {
      return NextResponse.json(
        { error: 'Customer ID and at least one item is required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customer = await prisma.b2CCustomer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Generate bill number
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    let billSequence = await prisma.billSequence.findUnique({
      where: { date: new Date(dateStr) }
    });

    if (!billSequence) {
      billSequence = await prisma.billSequence.create({
        data: {
          date: new Date(dateStr),
          sequence: 1
        }
      });
    } else {
      billSequence = await prisma.billSequence.update({
        where: { date: new Date(dateStr) },
        data: { sequence: { increment: 1 } }
      });
    }

    const billSno = `B2C-${dateStr.replace(/-/g, '')}-${billSequence.sequence.toString().padStart(4, '0')}`;

    // Calculate revenue totals
    const gasTotal = gasItems.reduce((sum: number, item: any) => sum + (item.pricePerItem * item.quantity), 0);
    const securityTotal = securityItems.reduce((sum: number, item: any) => sum + (item.pricePerItem * item.quantity), 0);
    const accessoryTotal = accessoryItems.reduce((sum: number, item: any) => sum + (item.pricePerItem * item.quantity), 0);
    const totalAmount = gasTotal + securityTotal + accessoryTotal;
    const finalAmount = totalAmount + Number(deliveryCharges);

    // Calculate cost totals
    const gasCost = gasItems.reduce((sum: number, item: any) => sum + ((item.costPrice || 0) * item.quantity), 0);
    const accessoryCost = accessoryItems.reduce((sum: number, item: any) => sum + ((item.costPrice || 0) * item.quantity), 0);
    
    // Calculate security return profit (25% deduction on returns)
    const securityReturnProfit = securityItems.reduce((sum: number, item: any) => {
      if (item.isReturn) {
        // When returning, customer gets 75%, we keep 25% as profit
        const originalSecurity = item.pricePerItem / 0.75; // Work backwards to get original amount
        const deduction = originalSecurity * 0.25;
        return sum + (deduction * item.quantity);
      }
      return sum;
    }, 0);
    
    // Calculate profit margins
    const gasProfit = gasTotal - gasCost;
    const accessoryProfit = accessoryTotal - accessoryCost;
    const deliveryProfit = Number(deliveryCharges) - Number(deliveryCost || 0);
    
    const totalCost = gasCost + accessoryCost;
    const actualProfit = gasProfit + accessoryProfit + deliveryProfit + securityReturnProfit;

    // Create transaction with all items in a transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // Create the main transaction
      const newTransaction = await tx.b2CTransaction.create({
        data: {
          billSno,
          customerId,
          date: new Date(date),
          time: new Date(time),
          totalAmount,
          deliveryCharges: Number(deliveryCharges),
          finalAmount,
          totalCost,
          deliveryCost: Number(deliveryCost || 0),
          actualProfit,
          paymentMethod,
          notes: notes || null
        }
      });

      // Create gas items with cost and profit tracking
      if (gasItems.length > 0) {
        await tx.b2CTransactionGasItem.createMany({
          data: gasItems.map((item: any) => {
            const totalPrice = item.pricePerItem * item.quantity;
            const costPrice = item.costPrice || 0;
            const totalCost = costPrice * item.quantity;
            const profitMargin = totalPrice - totalCost;
            
            return {
              transactionId: newTransaction.id,
              cylinderType: item.cylinderType,
              quantity: item.quantity,
              pricePerItem: item.pricePerItem,
              totalPrice,
              costPrice,
              totalCost,
              profitMargin
            };
          })
        });
      }

      // Create security items and cylinder holdings
      if (securityItems.length > 0) {
        await tx.b2CTransactionSecurityItem.createMany({
          data: securityItems.map((item: any) => ({
            transactionId: newTransaction.id,
            cylinderType: item.cylinderType,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            totalPrice: item.pricePerItem * item.quantity,
            isReturn: item.isReturn,
            deductionRate: item.isReturn ? 0.25 : 0
          }))
        });

        // Create or update cylinder holdings
        for (const item of securityItems) {
          if (!item.isReturn) {
            // New security deposit - create cylinder holding
            await tx.b2CCylinderHolding.create({
              data: {
                customerId,
                cylinderType: item.cylinderType,
                quantity: item.quantity,
                securityAmount: item.pricePerItem,
                issueDate: new Date(date)
              }
            });
          } else {
            // Return - mark cylinder holdings as returned
            const holdings = await tx.b2CCylinderHolding.findMany({
              where: {
                customerId,
                cylinderType: item.cylinderType,
                isReturned: false
              },
              orderBy: { issueDate: 'asc' }
            });

            let remainingQuantity = item.quantity;
            for (const holding of holdings) {
              if (remainingQuantity <= 0) break;
              
              const returnQuantity = Math.min(remainingQuantity, holding.quantity);
              const deduction = holding.securityAmount * 0.25;
              
              await tx.b2CCylinderHolding.update({
                where: { id: holding.id },
                data: {
                  returnDate: new Date(date),
                  isReturned: true,
                  returnDeduction: deduction
                }
              });
              
              remainingQuantity -= returnQuantity;
            }
          }
        }
      }

      // Create accessory items with cost and profit tracking
      if (accessoryItems.length > 0) {
        await tx.b2CTransactionAccessoryItem.createMany({
          data: accessoryItems.map((item: any) => {
            const totalPrice = item.pricePerItem * item.quantity;
            const costPrice = item.costPrice || 0;
            const totalCost = costPrice * item.quantity;
            const profitMargin = totalPrice - totalCost;
            
            return {
              transactionId: newTransaction.id,
              itemName: item.itemName,
              quantity: item.quantity,
              pricePerItem: item.pricePerItem,
              totalPrice,
              costPrice,
              totalCost,
              profitMargin
            };
          })
        });
      }

      // ===== INVENTORY INTEGRATION =====
      
      // 1. Deduct cylinders from inventory when security is paid (gas purchase)
      if (gasItems.length > 0) {
        for (const gasItem of gasItems) {
          if (gasItem.quantity > 0) {
            const cylinderType = gasItem.cylinderType;
            let mappedCylinderType: CylinderType;
            
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: 
                console.log(`Unknown cylinder type: ${cylinderType}`); 
                continue;
            }

            // Find available cylinders of this type
            const availableCylinders = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: 'FULL'
              },
              take: gasItem.quantity
            });

            if (availableCylinders.length < gasItem.quantity) {
              throw new Error(`Insufficient inventory: Only ${availableCylinders.length} ${cylinderType} cylinders available, but ${gasItem.quantity} requested`);
            }

            // Update cylinders to "WITH_CUSTOMER" status
            await tx.cylinder.updateMany({
              where: {
                id: { in: availableCylinders.map(c => c.id) }
              },
              data: {
                currentStatus: 'WITH_CUSTOMER',
                location: `B2C Customer: ${customer.name || 'B2C Customer'}`
              }
            });

            console.log(`[B2C] Deducted ${gasItem.quantity} ${cylinderType} cylinders from inventory`);
          }
        }
      }

      // 2. Return cylinders back to inventory when customer returns them
      if (securityItems.length > 0) {
        for (const securityItem of securityItems) {
          if (securityItem.isReturn && securityItem.quantity > 0) {
            const cylinderType = securityItem.cylinderType;
            let mappedCylinderType: CylinderType;
            
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: 
                console.log(`Unknown cylinder type: ${cylinderType}`); 
                continue;
            }

            // Find cylinders that are with B2C customers
            const cylindersWithCustomer = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: 'WITH_CUSTOMER',
                location: { contains: 'B2C Customer' }
              },
              take: securityItem.quantity
            });

            if (cylindersWithCustomer.length >= securityItem.quantity) {
              // Update existing cylinders to EMPTY status
              await tx.cylinder.updateMany({
                where: {
                  id: { in: cylindersWithCustomer.slice(0, securityItem.quantity).map(c => c.id) }
                },
                data: {
                  currentStatus: 'EMPTY',
                  location: 'Store - Ready for Refill'
                }
              });
              console.log(`[B2C] Returned ${securityItem.quantity} ${cylinderType} cylinders to inventory as EMPTY`);
            } else {
              // If not enough found with customer, create new empty cylinders
              const cylindersToCreate = securityItem.quantity - cylindersWithCustomer.length;
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
              console.log(`[B2C] Returned ${securityItem.quantity} empty ${cylinderType} cylinders to inventory (${cylindersWithCustomer.length} updated, ${cylindersToCreate} created)`);
            }
          }
        }
      }

      // 3. Deduct accessories from inventory
      if (accessoryItems.length > 0) {
        for (const accessory of accessoryItems) {
          if (accessory.quantity > 0) {
            const itemName = accessory.itemName.toLowerCase();

            // Handle different accessory types
            if (itemName.includes('stove')) {
              // Extract quality from item name (e.g., "Stove - A" -> "A")
              const qualityMatch = accessory.itemName.match(/(?:Stove|stove)\s*-?\s*([A-Z])/i);
              const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'A';
              
              const stove = await tx.stove.findFirst({
                where: { quality: quality }
              });
              
              if (stove) {
                if (stove.quantity < accessory.quantity) {
                  throw new Error(`Insufficient stove inventory: Only ${stove.quantity} ${quality}-quality stoves available, but ${accessory.quantity} requested`);
                }
                
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
                console.log(`[B2C] Deducted ${accessory.quantity} ${quality}-quality stoves from inventory`);
              } else {
                console.warn(`[B2C] Stove with quality ${quality} not found in inventory`);
              }
            } else if (itemName.includes('regulator')) {
              // Handle regulators
              const regulator = await tx.regulator.findFirst();
              
              if (regulator) {
                if (regulator.quantity < accessory.quantity) {
                  throw new Error(`Insufficient regulator inventory: Only ${regulator.quantity} regulators available, but ${accessory.quantity} requested`);
                }
                
                await tx.regulator.update({
                  where: { id: regulator.id },
                  data: {
                    quantity: {
                      decrement: accessory.quantity
                    },
                    totalCost: {
                      decrement: accessory.quantity * regulator.costPerPiece
                    }
                  }
                });
                console.log(`[B2C] Deducted ${accessory.quantity} regulators from inventory`);
              } else {
                console.warn(`[B2C] Regulator not found in inventory`);
              }
            } else if (itemName.includes('pipe') || itemName.includes('hose')) {
              // Handle gas pipes
              const gasPipe = await tx.gasPipe.findFirst();
              
              if (gasPipe) {
                if (gasPipe.quantity < accessory.quantity) {
                  throw new Error(`Insufficient gas pipe inventory: Only ${gasPipe.quantity} gas pipes available, but ${accessory.quantity} requested`);
                }
                
                await tx.gasPipe.update({
                  where: { id: gasPipe.id },
                  data: {
                    quantity: {
                      decrement: accessory.quantity
                    }
                  }
                });
                console.log(`[B2C] Deducted ${accessory.quantity} gas pipes from inventory`);
              } else {
                console.warn(`[B2C] Gas pipe not found in inventory`);
              }
            } else {
              // Handle other accessories from Product table
              const product = await tx.product.findFirst({
                where: { 
                  name: { 
                    contains: accessory.itemName,
                    mode: 'insensitive'
                  } 
                }
              });
              
              if (product) {
                if (product.stockQuantity < accessory.quantity) {
                  throw new Error(`Insufficient ${accessory.itemName} inventory: Only ${product.stockQuantity} available, but ${accessory.quantity} requested`);
                }
                
                await tx.product.update({
                  where: { id: product.id },
                  data: {
                    stockQuantity: {
                      decrement: accessory.quantity
                    }
                  }
                });
                console.log(`[B2C] Deducted ${accessory.quantity} ${accessory.itemName} from inventory`);
              } else {
                console.warn(`[B2C] Product ${accessory.itemName} not found in inventory`);
              }
            }
          }
        }
      }

      // ===== END INVENTORY INTEGRATION =====

      // Update customer's actual profit margin
      // Profit = (Selling Price - Cost Price) for all items + Security Deductions + Delivery Profit
      await tx.b2CCustomer.update({
        where: { id: customerId },
        data: {
          totalProfit: {
            increment: actualProfit // Actual profit margin, not revenue
          }
        }
      });

      return newTransaction;
    });

    return NextResponse.json(transaction, { status: 201 });

  } catch (error) {
    console.error('Error creating B2C transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
