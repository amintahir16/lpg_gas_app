import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { B2BTransactionType } from '@prisma/client';
import { generateCylinderTypeFromCapacity, getCapacityFromTypeString } from '@/lib/cylinder-utils';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin, clampLimit } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const transactionType = searchParams.get('transactionType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 10);
    const skip = (page - 1) * limit;

    const whereClause: any = { ...regionScopedWhere(regionId) };
    
    if (customerId) {
      whereClause.customerId = customerId;
    }
    
    if (transactionType) {
      whereClause.transactionType = transactionType;
    }

    const [transactions, total] = await Promise.all([
      prisma.b2BTransaction.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              contactPerson: true,
            },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.b2BTransaction.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate via verified session — never trust the spoofable
    // `x-user-id` header alone, and never fall back to "any admin".
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const userId = auth.session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'No valid user found' }, { status: 401 });
    }

    const body = await request.json();
    const {
      transactionType,
      billSno,
      customerId,
      date,
      time,
      totalAmount,
      paymentReference,
      notes,
      items,
    } = body;

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

    const regionId = getActiveRegionId(request);

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.b2BTransaction.create({
        data: {
          transactionType: transactionType as B2BTransactionType,
          billSno,
          customerId,
          date: transactionDate,
          time: transactionTime,
          totalAmount: parseFloat(totalAmount),
          paymentReference,
          notes,
          createdBy: user.id,
          ...(regionId ? { regionId } : {}),
        },
      });

      // Create transaction items
      const transactionItems = await tx.b2BTransactionItem.createMany({
        data: items.map((item: any) => ({
          transactionId: transaction.id,
          productId: item.productId,
          productName: item.productName,
          quantity: parseFloat(item.quantity),
          pricePerItem: parseFloat(item.pricePerItem),
          totalPrice: parseFloat(item.totalPrice),
          cylinderType: item.cylinderType,
          returnedCondition: item.returnedCondition,
          remainingKg: item.remainingKg ? parseFloat(item.remainingKg) : null,
          originalSoldPrice: item.originalSoldPrice ? parseFloat(item.originalSoldPrice) : null,
          buybackRate: item.buybackRate ? parseFloat(item.buybackRate) : null,
          buybackPricePerItem: item.buybackPricePerItem ? parseFloat(item.buybackPricePerItem) : null,
          buybackTotal: item.buybackTotal ? parseFloat(item.buybackTotal) : null,
        })),
      });

      // Update customer ledger balance based on transaction type
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      let newLedgerBalance = parseFloat(customer.ledgerBalance.toString());

      switch (transactionType) {
        case 'SALE':
          newLedgerBalance += parseFloat(totalAmount);
          break;
        case 'PAYMENT':
          newLedgerBalance -= parseFloat(totalAmount);
          break;
        case 'BUYBACK':
          newLedgerBalance -= parseFloat(totalAmount);
          break;
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          newLedgerBalance -= parseFloat(totalAmount);
          break;
      }

      // Update customer ledger balance and cylinder due counts
      const updateData: any = {
        ledgerBalance: newLedgerBalance,
      };

      // Update cylinder due counts for sales and returns
      if (transactionType === 'SALE') {
        for (const item of items) {
          if (item.cylinderType) {
            switch (item.cylinderType) {
              case 'Domestic (11.8kg)':
                updateData.domestic118kgDue = (customer.domestic118kgDue || 0) + parseInt(item.quantity);
                break;
              case 'Standard (15kg)':
                updateData.standard15kgDue = (customer.standard15kgDue || 0) + parseInt(item.quantity);
                break;
              case 'Commercial (45.4kg)':
                updateData.commercial454kgDue = (customer.commercial454kgDue || 0) + parseInt(item.quantity);
                break;
            }
          }
        }
      } else if (transactionType === 'RETURN_EMPTY' || transactionType === 'BUYBACK') {
        for (const item of items) {
          if (item.cylinderType) {
            const quantity = parseInt(item.quantity);
            switch (item.cylinderType) {
              case 'Domestic (11.8kg)':
                updateData.domestic118kgDue = Math.max(0, (customer.domestic118kgDue || 0) - quantity);
                break;
              case 'Standard (15kg)':
                updateData.standard15kgDue = Math.max(0, (customer.standard15kgDue || 0) - quantity);
                break;
              case 'Commercial (45.4kg)':
                updateData.commercial454kgDue = Math.max(0, (customer.commercial454kgDue || 0) - quantity);
                break;
            }
          }
        }
      }

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: updateData,
      });

      // Update inventory for sales and returns
      for (const item of items) {
        if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            let newStockQuantity = product.stockQuantity;
            
            if (transactionType === 'SALE') {
              newStockQuantity -= parseFloat(item.quantity);
            } else if (transactionType === 'RETURN_EMPTY' || transactionType === 'BUYBACK') {
              newStockQuantity += parseFloat(item.quantity);
            }

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: newStockQuantity,
                stockType: transactionType === 'RETURN_EMPTY' ? 'EMPTY' : 
                          transactionType === 'BUYBACK' && item.returnedCondition === 'PARTIAL' ? 'PARTIAL' : 'FILLED',
                remainingKg: item.remainingKg ? parseFloat(item.remainingKg) : null,
              },
            });
          }
        } else if (transactionType === 'RETURN_EMPTY' || transactionType === 'BUYBACK') {
          // Add empty cylinders back to cylinder inventory
          const quantity = parseInt(item.quantity);
          const cylinderType = item.cylinderType;
          
          if (quantity > 0 && cylinderType) {
            // Parse display name to extract typeName and capacity dynamically
            // Handles formats like: "Domestic (11.8kg)", "Special (10kg)", "Standard (15kg)"
            let typeName: string | null = null;
            let capacity: number;
            let typeString: string;
            
            if (cylinderType.includes('(') && cylinderType.includes('kg)')) {
              // Extract typeName and capacity from display name (e.g., "Special (10kg)" -> typeName: "Special", capacity: 10)
              const nameMatch = cylinderType.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
              if (nameMatch) {
                typeName = nameMatch[1].trim();
                capacity = parseFloat(nameMatch[2]);
                // Generate enum dynamically from capacity
                typeString = generateCylinderTypeFromCapacity(capacity);
              } else {
                console.log(`Could not parse cylinder type: ${cylinderType}`);
                continue;
              }
            } else {
              // If it's already a type string (e.g., "STANDARD_15KG"), extract capacity from it
              typeString = cylinderType;
              capacity = getCapacityFromTypeString(cylinderType);
            }

            // Create empty cylinders in inventory
            const initialCylinderCount = await tx.cylinder.count();
            for (let i = 0; i < quantity; i++) {
              const code = `CYL${String(initialCylinderCount + 1 + i).padStart(3, '0')}`;
              
              await tx.cylinder.create({
                data: {
                  code,
                  cylinderType: typeString,
                  typeName: typeName,
                  capacity: capacity,
                  currentStatus: 'EMPTY',
                  location: 'Returned from Customer',
                  ...(regionId ? { regionId } : {}),
                },
              });
            }
            
            console.log(`Added ${quantity} empty ${cylinderType} cylinders to inventory (typeString: ${typeString}, capacity: ${capacity}kg)`);
          }
        }
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Log full details server-side, but don't echo `error.message` (which can
    // contain Prisma payloads / SQL fragments) to the client.
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
