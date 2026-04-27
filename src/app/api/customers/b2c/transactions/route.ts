import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { InventoryDeductionService } from '@/lib/inventory-deduction';
import { getCapacityFromTypeString } from '@/lib/cylinder-utils';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import {
  notifyUserActivity,
  checkAllCylinderTypesForLowStock,
  checkAccessoriesForLowStock,
} from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

// Define types for transaction items
interface TransactionGasItem {
  cylinderType?: string;
  quantity: number;
  pricePerItem: number;
  costPrice?: number;
}

interface TransactionSecurityItem {
  cylinderType: string;
  quantity: number;
  pricePerItem: number;
  isReturn?: boolean;
}

interface TransactionAccessoryItem {
  itemName?: string;
  category?: string;
  itemType?: string;
  quantity: number;
  pricePerItem: number;
  totalPrice?: number;
  costPrice?: number;
  costPerPiece?: number;
  isVaporizer?: boolean;
  usagePrice?: number;
  sellingPrice?: number;
}

interface AccessorySaleItem {
  category: string;
  itemType: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  // Vaporizer-specific fields
  isVaporizer?: boolean;
  usagePrice?: number; // Cost Price - for charging usage (not deducted from inventory)
  sellingPrice?: number; // Selling Price - for selling vaporizer (deducted from inventory)
  costPerPiece?: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const {
      customerId,
      date,
      time,
      deliveryCharges = 0,
      deliveryCost = 0,
      paymentMethod = 'CASH',
      notes,
      gasItems = [] as TransactionGasItem[],
      securityItems = [] as TransactionSecurityItem[],
      accessoryItems = [] as TransactionAccessoryItem[]
    } = body;

    // Validate required fields
    if (!customerId || (!gasItems.length && !securityItems.length && !accessoryItems.length)) {
      return NextResponse.json(
        { error: 'Customer ID and at least one item is required' },
        { status: 400 }
      );
    }

    // Check if customer exists and get margin category (region-scoped)
    const customer = await prisma.b2CCustomer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
      include: { marginCategory: true }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found in current region' },
        { status: 404 }
      );
    }

    // Generate per-customer sequential bill number
    const updatedCustomer = await prisma.b2CCustomer.update({
      where: { id: customerId },
      data: { billSequence: { increment: 1 } }
    });

    // Simple sequential number: 1, 2, 3...
    const billSno = updatedCustomer.billSequence.toString();

    // Calculate revenue totals
    const gasTotal = gasItems.reduce((sum: number, item: TransactionGasItem) => sum + (item.pricePerItem * item.quantity), 0);
    const securityTotal = securityItems.reduce((sum: number, item: TransactionSecurityItem) => sum + (item.pricePerItem * item.quantity), 0);
    // Accessories: use totalPrice if provided (from ProfessionalAccessorySelector), otherwise calculate
    const accessoryTotal = accessoryItems.reduce((sum: number, item: TransactionAccessoryItem) => {
      return sum + (item.totalPrice || (item.pricePerItem * item.quantity));
    }, 0);
    const totalAmount = gasTotal + securityTotal + accessoryTotal;
    const finalAmount = totalAmount + Number(deliveryCharges);

    // Calculate cost totals
    // Calculate cost totals
    const gasCost = gasItems.reduce((sum: number, item: TransactionGasItem) => sum + ((item.costPrice || 0) * item.quantity), 0);
    // Accessories: use costPrice if provided, otherwise calculate from costPerPiece
    const accessoryCost = accessoryItems.reduce((sum: number, item: TransactionAccessoryItem) => {
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

    // Calculate profit margins
    const gasProfit = (() => {
      const marginCategory = customer.marginCategory;
      if (!marginCategory) return gasTotal - gasCost; // Fallback to old calculation

      // Calculate profit based on margin per kg for each gas item
      return gasItems.reduce((total: number, item: TransactionGasItem) => {
        if (!item.cylinderType) return total;

        // Get cylinder weight dynamically from type - fully flexible
        const cylinderWeight = getCapacityFromTypeString(item.cylinderType);

        // Calculate profit based on margin per kg: marginPerKg × cylinderWeight × quantity
        const marginPerKg = Number(marginCategory.marginPerKg);
        return total + (marginPerKg * cylinderWeight * item.quantity);
      }, 0);
    })();

    const accessoryProfit = accessoryTotal - accessoryCost;
    const deliveryProfit = Number(deliveryCharges) - Number(deliveryCost || 0);

    const totalCost = gasCost + accessoryCost;
    // Note: actualProfit will be updated inside transaction to include security return deductions
    const actualProfit = gasProfit + accessoryProfit + deliveryProfit;

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
          createdBy: session.user.id,
          ...(regionId ? { regionId } : {}),
        }
      });

      // Create gas items with cost and profit tracking
      if (gasItems.length > 0) {
        await tx.b2CTransactionGasItem.createMany({
          data: gasItems.map((item: TransactionGasItem) => {
            const totalPrice = item.pricePerItem * item.quantity;
            const costPrice = item.costPrice || 0;
            const totalCost = costPrice * item.quantity;

            // Calculate profit margin based on margin per kg if margin category is available
            let profitMargin = totalPrice - totalCost; // Default fallback
            if (customer.marginCategory && item.cylinderType) {
              // Get cylinder weight dynamically from type - fully flexible
              const cylinderWeight = getCapacityFromTypeString(item.cylinderType);

              // Calculate profit based on margin per kg: marginPerKg × cylinderWeight × quantity
              const marginPerKg = Number(customer.marginCategory.marginPerKg);
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
          data: securityItems.map((item: TransactionSecurityItem) => ({
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
            const cylinderType = item.cylinderType; // Use string directly

            // Find available cylinders of this type (region-scoped, FULL status)
            const availableCylinders = await tx.cylinder.findMany({
              where: {
                cylinderType: cylinderType,
                currentStatus: 'FULL',
                ...regionScopedWhere(regionId),
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
            // Region scope is inherited via the customer relation
            await tx.b2CCylinderHolding.create({
              data: {
                customerId,
                cylinderType: item.cylinderType,
                quantity: item.quantity,
                securityAmount: item.pricePerItem,
                issueDate: new Date(date),
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
          data: accessoryItems.map((item: TransactionAccessoryItem) => {
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
        console.log(`[B2C] Gas purchase (refill): ${gasItems.reduce((sum: number, item: TransactionGasItem) => sum + item.quantity, 0)} cylinder(s) refilled - NO inventory deduction (customer already owns cylinder body from security deposit)`);
      }

      // 2. Return cylinders back to inventory when customer returns them
      if (securityItems.length > 0) {
        for (const securityItem of securityItems) {
          if (securityItem.isReturn && securityItem.quantity > 0) {
            const cylinderType = securityItem.cylinderType; // Use string directly

            // Find cylinders that are with THIS specific B2C customer (region-scoped)
            const cylindersWithCustomer = await tx.cylinder.findMany({
              where: {
                cylinderType: cylinderType,
                currentStatus: 'WITH_CUSTOMER',
                location: { contains: `B2C Customer: ${customer.name}` },
                ...regionScopedWhere(regionId),
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

              // Create new cylinders for the remaining quantity (region-scoped)
              const initialCylinderCount = await tx.cylinder.count();
              for (let i = 0; i < cylindersToCreate; i++) {
                const code = `CYL${String(initialCylinderCount + 1 + i).padStart(3, '0')}`;
                await tx.cylinder.create({
                  data: {
                    code,
                    cylinderType: cylinderType,
                    capacity: getCapacityFromTypeString(cylinderType),
                    currentStatus: 'EMPTY',
                    location: 'Store - Ready for Refill',
                    ...(regionId ? { regionId } : {}),
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
        const accessorySaleItems: AccessorySaleItem[] = accessoryItems
          .filter((item: TransactionAccessoryItem) => item.quantity > 0)
          .map((item: TransactionAccessoryItem) => {
            // Parse category and itemType from itemName (format: "Category - ItemType")
            const parts = (item.itemName || '').split(' - ');
            const category = parts[0] || item.category || 'Unknown';
            const itemType = parts[1] || item.itemType || 'Unknown';

            return {
              category: category,
              itemType: itemType,
              quantity: item.quantity,
              pricePerItem: item.pricePerItem,
              totalPrice: item.totalPrice || 0,
              // Vaporizer-specific fields
              isVaporizer: item.isVaporizer || false,
              usagePrice: item.usagePrice || 0,
              sellingPrice: item.sellingPrice || 0,
              costPerPiece: item.costPerPiece || item.costPrice || 0
            };
          });

        if (accessorySaleItems.length > 0) {
          // Log vaporizer pricing information if present
          const vaporizerItems = accessorySaleItems.filter((item: AccessorySaleItem) => item.isVaporizer);
          if (vaporizerItems.length > 0) {
            console.log('🌫️ Processing vaporizer items:');
            vaporizerItems.forEach((item: AccessorySaleItem) => {
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

    // ---- Post-commit side effects: activity log + super-admin notifications ----
    try {
      const customerName = customer?.name || 'B2C Customer';
      const link = `/customers/b2c/${customerId}?tx=${transaction.id}`;

      const detailsParts: string[] = [
        `Customer: ${customerName}`,
        `Bill #: ${billSno}`,
        `Total: Rs ${Number(finalAmount).toLocaleString()}`,
      ];
      if (paymentMethod) detailsParts.push(`Method: ${paymentMethod}`);
      if (gasItems.length) detailsParts.push(`Gas items: ${gasItems.length}`);
      if (securityItems.length) detailsParts.push(`Security items: ${securityItems.length}`);
      if (accessoryItems.length) detailsParts.push(`Accessories: ${accessoryItems.length}`);

      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2C_TRANSACTION_CREATED,
        entityType: 'B2C_TRANSACTION',
        entityId: transaction.id,
        details: detailsParts.join(' • '),
        link,
        regionId,
        metadata: {
          customerId,
          customerName,
          billSno,
          totalAmount: Number(totalAmount),
          finalAmount: Number(finalAmount),
          paymentMethod,
        },
      });

      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: 'New B2C transaction',
        message: `${session.user.name || session.user.email} recorded a B2C sale of Rs ${Number(finalAmount).toLocaleString()} for ${customerName} (Bill #${billSno}).`,
        link,
        priority: 'MEDIUM',
        regionId,
        metadata: {
          domain: 'B2C_TRANSACTION',
          transactionId: transaction.id,
          customerId,
          customerName,
          billSno,
          finalAmount: Number(finalAmount),
        },
      });

      // Low-stock checks
      const cylinderTypesAffected = [
        ...gasItems.map((g: TransactionGasItem) => g.cylinderType).filter(Boolean) as string[],
        ...securityItems.map((s: TransactionSecurityItem) => s.cylinderType).filter(Boolean),
      ];
      if (cylinderTypesAffected.length > 0) {
        await checkAllCylinderTypesForLowStock(cylinderTypesAffected, regionId);
      }

      if (accessoryItems.length > 0) {
        const accessoriesForCheck = accessoryItems
          .filter((a: TransactionAccessoryItem) => (a.quantity ?? 0) > 0)
          .map((a: TransactionAccessoryItem) => {
            const itemName = a.itemName || '';
            const [category, ...rest] = itemName.split(' - ');
            return {
              category: (category || a.category || '').trim(),
              itemType: (rest.join(' - ') || a.itemType || category || '').trim(),
            };
          })
          .filter((it) => it.category && it.itemType);
        if (accessoriesForCheck.length > 0) {
          await checkAccessoriesForLowStock(accessoriesForCheck);
        }
      }
    } catch (sideEffectError) {
      console.error('B2C transaction post-commit side effects failed:', sideEffectError);
    }

    return NextResponse.json(transaction, { status: 201 });

  } catch (error) {
    console.error('Error creating B2C transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
