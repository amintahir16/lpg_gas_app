import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { B2BTransactionType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const transactionType = searchParams.get('transactionType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    
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
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.b2BTransaction.create({
        data: {
          transactionType: transactionType as B2BTransactionType,
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

      let newLedgerBalance = customer.ledgerBalance;
      
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
                updateData.domestic118kgDue = customer.domestic118kgDue + parseInt(item.quantity);
                break;
              case 'Standard (15kg)':
                updateData.standard15kgDue = customer.standard15kgDue + parseInt(item.quantity);
                break;
              case 'Commercial (45.4kg)':
                updateData.commercial454kgDue = customer.commercial454kgDue + parseInt(item.quantity);
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
                updateData.domestic118kgDue = Math.max(0, customer.domestic118kgDue - quantity);
                break;
              case 'Standard (15kg)':
                updateData.standard15kgDue = Math.max(0, customer.standard15kgDue - quantity);
                break;
              case 'Commercial (45.4kg)':
                updateData.commercial454kgDue = Math.max(0, customer.commercial454kgDue - quantity);
                break;
            }
          }
        }
      }

      await tx.customer.update({
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
        }
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
