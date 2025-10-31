import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CylinderType } from '@prisma/client';
import { InventoryDeductionService } from '@/lib/inventory-deduction';

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

    // Check if customer exists and get margin category
    const customer = await prisma.b2CCustomer.findUnique({
      where: { id: customerId },
      include: { marginCategory: true }
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
    // Accessories: use totalPrice if provided (from ProfessionalAccessorySelector), otherwise calculate
    const accessoryTotal = accessoryItems.reduce((sum: number, item: any) => {
      return sum + (item.totalPrice || (item.pricePerItem * item.quantity));
    }, 0);
    const totalAmount = gasTotal + securityTotal + accessoryTotal;
    const finalAmount = totalAmount + Number(deliveryCharges);

    // Calculate cost totals
    const gasCost = gasItems.reduce((sum: number, item: any) => sum + ((item.costPrice || 0) * item.quantity), 0);
    // Accessories: use costPrice if provided, otherwise calculate from costPerPiece
    const accessoryCost = accessoryItems.reduce((sum: number, item: any) => {
      if (item.costPrice !== undefined) {
        return sum + (item.costPrice * item.quantity);
      }
      // Fallback: use costPerPiece * quantity (for new ProfessionalAccessorySelector format)
      return sum + ((item.costPerPiece || 0) * item.quantity);
    }, 0);
    
    // Calculate security return profit (25% deduction on returns)
    // Note: We need to look up the actual security amounts from holdings to calculate correctly
    // For now, we'll calculate it during the transaction when we have access to holdings
    // This will be summed up from the returnDeduction values we calculate
    let securityReturnProfit = 0;
    
    // Calculate profit margins
    const gasProfit = (() => {
      if (!customer.marginCategory) return gasTotal - gasCost; // Fallback to old calculation
      
      // Calculate profit based on margin per kg for each gas item
      return gasItems.reduce((total: number, item: any) => {
        if (!item.cylinderType) return total;
        
        // Get cylinder weight based on type
        let cylinderWeight = 0;
        switch (item.cylinderType) {
          case 'DOMESTIC_11_8KG':
            cylinderWeight = 11.8;
            break;
          case 'STANDARD_15KG':
            cylinderWeight = 15.0;
            break;
          case 'COMMERCIAL_45_4KG':
            cylinderWeight = 45.4;
            break;
          default:
            cylinderWeight = 15.0;
        }
        
        // Calculate profit based on margin per kg: marginPerKg × cylinderWeight × quantity
        const marginPerKg = customer.marginCategory.marginPerKg;
        return total + (marginPerKg * cylinderWeight * item.quantity);
      }, 0);
    })();
    
    const accessoryProfit = accessoryTotal - accessoryCost;
    const deliveryProfit = Number(deliveryCharges) - Number(deliveryCost || 0);
    
    const totalCost = gasCost + accessoryCost;
    // Note: actualProfit will be updated inside transaction to include security return deductions
    let actualProfit = gasProfit + accessoryProfit + deliveryProfit;

    // Create transaction with all items in a transaction
    let calculatedSecurityReturnProfit = 0;
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
          notes: notes || null,
          createdBy: session.user.id
        }
      });

      // Create gas items with cost and profit tracking
      if (gasItems.length > 0) {
        await tx.b2CTransactionGasItem.createMany({
          data: gasItems.map((item: any) => {
            const totalPrice = item.pricePerItem * item.quantity;
            const costPrice = item.costPrice || 0;
            const totalCost = costPrice * item.quantity;
            
            // Calculate profit margin based on margin per kg if margin category is available
            let profitMargin = totalPrice - totalCost; // Default fallback
            if (customer.marginCategory && item.cylinderType) {
              // Get cylinder weight based on type
              let cylinderWeight = 0;
              switch (item.cylinderType) {
                case 'DOMESTIC_11_8KG':
                  cylinderWeight = 11.8;
                  break;
                case 'STANDARD_15KG':
                  cylinderWeight = 15.0;
                  break;
                case 'COMMERCIAL_45_4KG':
                  cylinderWeight = 45.4;
                  break;
                default:
                  cylinderWeight = 15.0;
              }
              
              // Calculate profit based on margin per kg: marginPerKg × cylinderWeight × quantity
              const marginPerKg = customer.marginCategory.marginPerKg;
              profitMargin = marginPerKg * cylinderWeight * item.quantity;
            }
            
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
            isReturn: item.isReturn
          }))
        });

        // Create or update cylinder holdings and deduct from inventory when security is paid
        for (const item of securityItems) {
          if (!item.isReturn) {
            // New security deposit - deduct from inventory and create cylinder holding record
            const cylinderType = item.cylinderType;
            let mappedCylinderType: CylinderType;
            
            switch (cylinderType) {
              case 'DOMESTIC_11_8KG': mappedCylinderType = CylinderType.DOMESTIC_11_8KG; break;
              case 'STANDARD_15KG': mappedCylinderType = CylinderType.STANDARD_15KG; break;
              case 'COMMERCIAL_45_4KG': mappedCylinderType = CylinderType.COMMERCIAL_45_4KG; break;
              default: 
                console.log(`Unknown cylinder type: ${cylinderType}`);
                continue;
            }

            // Find available cylinders of this type (FULL status)
            const availableCylinders = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: 'FULL'
              },
              take: item.quantity
            });

            if (availableCylinders.length < item.quantity) {
              throw new Error(`Insufficient inventory: Only ${availableCylinders.length} ${cylinderType} cylinders available, but ${item.quantity} requested for security deposit`);
            }

            // Update cylinders to "WITH_CUSTOMER" status (customer is getting the cylinder body)
            await tx.cylinder.updateMany({
              where: {
                id: { in: availableCylinders.map(c => c.id) }
              },
              data: {
                currentStatus: 'WITH_CUSTOMER',
                location: `B2C Customer: ${customer.name || 'B2C Customer'}`
              }
            });

            // Create cylinder holding record (shown in Current Cylinder Holdings card)
            await tx.b2CCylinderHolding.create({
              data: {
                customerId,
                cylinderType: item.cylinderType,
                quantity: item.quantity,
                securityAmount: item.pricePerItem,
                issueDate: new Date(date)
              }
            });

            console.log(`[B2C] Security deposit: Deducted ${item.quantity} ${cylinderType} cylinder(s) from inventory (FULL → WITH_CUSTOMER) and created holding record`);
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
              // Calculate 25% deduction per cylinder being returned (this is profit)
              const deductionPerCylinder = Number(holding.securityAmount) * 0.25;
              const totalDeduction = deductionPerCylinder * returnQuantity;
              
              // Add deduction to security return profit (this is our profit from the return)
              calculatedSecurityReturnProfit += totalDeduction;
              
              await tx.b2CCylinderHolding.update({
                where: { id: holding.id },
                data: {
                  returnDate: new Date(date),
                  isReturned: true,
                  returnDeduction: totalDeduction
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
            // Use totalPrice if provided (from ProfessionalAccessorySelector), otherwise calculate
            const totalPrice = item.totalPrice || (item.pricePerItem * item.quantity);
            // Use costPrice if provided, otherwise use costPerPiece * quantity
            const costPrice = item.costPrice !== undefined ? item.costPrice : (item.costPerPiece || 0);
            const totalCost = costPrice * item.quantity;
            const profitMargin = totalPrice - totalCost;
            
            return {
              transactionId: newTransaction.id,
              productName: item.itemName,
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
      
      // 1. Gas purchases (refills) - NO inventory deduction
      // NOTE: Customer already owns the cylinder body from security deposit
      // Gas purchase is just a refill, the cylinder is already with the customer
      // No inventory change needed - cylinder status remains WITH_CUSTOMER
      if (gasItems.length > 0) {
        console.log(`[B2C] Gas purchase (refill): ${gasItems.reduce((sum, item) => sum + item.quantity, 0)} cylinder(s) refilled - NO inventory deduction (customer already owns cylinder body from security deposit)`);
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

            // Find cylinders that are with THIS specific B2C customer
            const cylindersWithCustomer = await tx.cylinder.findMany({
              where: {
                cylinderType: mappedCylinderType,
                currentStatus: 'WITH_CUSTOMER',
                location: { contains: `B2C Customer: ${customer.name}` }
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

      // 3. Deduct accessories from inventory using professional inventory deduction service (same as B2B)
      if (accessoryItems.length > 0) {
        console.log('🔄 Processing accessories inventory deduction for B2C...');
        
        // Convert accessory items to the format expected by InventoryDeductionService
        const accessorySaleItems = accessoryItems
          .filter((item: any) => item.quantity > 0)
          .map((item: any) => {
            // Parse category and itemType from itemName (format: "Category - ItemType")
            const parts = (item.itemName || '').split(' - ');
            const category = parts[0] || item.category || 'Unknown';
            const itemType = parts[1] || item.itemType || 'Unknown';
            
            return {
              category: category,
              itemType: itemType,
              quantity: item.quantity,
              pricePerItem: item.pricePerItem,
              totalPrice: item.totalPrice,
              // Vaporizer-specific fields
              isVaporizer: item.isVaporizer || false,
              usagePrice: item.usagePrice || 0,
              sellingPrice: item.sellingPrice || 0,
              costPerPiece: item.costPerPiece || item.costPrice || 0
            };
          });
        
        if (accessorySaleItems.length > 0) {
          // Log vaporizer pricing information if present
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
          console.log('✅ B2C accessories inventory deduction completed successfully');
        }
      }

      // ===== END INVENTORY INTEGRATION =====

      // Update transaction with final actualProfit including security return deductions
      const finalActualProfit = actualProfit + calculatedSecurityReturnProfit;
      await tx.b2CTransaction.update({
        where: { id: newTransaction.id },
        data: {
          actualProfit: finalActualProfit
        }
      });

      // Update customer's actual profit margin
      // Profit = (Selling Price - Cost Price) for all items + Security Deductions + Delivery Profit
      await tx.b2CCustomer.update({
        where: { id: customerId },
        data: {
          totalProfit: {
            increment: finalActualProfit // Actual profit margin, including security return deductions
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
