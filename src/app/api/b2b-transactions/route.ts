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
      billSno,
      customerId,
      date,
      time,
      totalAmount,
      paymentReference,
      notes,
      items,
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
      
      console.log('Current ledger balance:', customer.ledgerBalance, 'Type:', typeof customer.ledgerBalance);
      console.log('Parsed ledger balance:', newLedgerBalance);
      console.log('Transaction amount:', totalAmount, 'Type:', typeof totalAmount);
      
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
      
      console.log('New ledger balance after calculation:', newLedgerBalance);

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

      console.log('Updating customer with data:', updateData);
      
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: updateData,
      });
      
      console.log('Customer updated successfully. New balance:', updatedCustomer.ledgerBalance);

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
            // Map display name to type string (e.g., "Domestic (11.8kg)" -> "DOMESTIC_11_8KG")
            let typeString: string;
            if (cylinderType.includes('Domestic') || cylinderType.includes('11.8')) {
              typeString = 'DOMESTIC_11_8KG';
            } else if (cylinderType.includes('Standard') || cylinderType.includes('15')) {
              typeString = 'STANDARD_15KG';
            } else if (cylinderType.includes('Commercial') || cylinderType.includes('45.4')) {
              typeString = 'COMMERCIAL_45_4KG';
            } else {
              console.log(`Unknown cylinder type: ${cylinderType}`);
              continue;
            }

            // Get capacity from type string
            const capacity = typeString === 'DOMESTIC_11_8KG' ? 11.8 :
                           typeString === 'STANDARD_15KG' ? 15.0 : 45.4;

            // Create empty cylinders in inventory
            const initialCylinderCount = await tx.cylinder.count();
            for (let i = 0; i < quantity; i++) {
              const code = `CYL${String(initialCylinderCount + 1 + i).padStart(3, '0')}`;
              
              await tx.cylinder.create({
                data: {
                  code,
                  cylinderType: typeString, // Use string type directly
                  capacity: capacity,
                  currentStatus: 'EMPTY',
                  location: 'Returned from Customer',
                },
              });
            }
            
            console.log(`Added ${quantity} empty ${cylinderType} cylinders to inventory`);
          }
        }
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    console.error('Transaction data:', {
      transactionType,
      customerId,
      items: items?.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        cylinderType: item.cylinderType,
        productId: item.productId
      }))
    });
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
