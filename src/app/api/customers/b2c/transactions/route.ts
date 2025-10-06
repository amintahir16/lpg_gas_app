import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Calculate totals
    const gasTotal = gasItems.reduce((sum: number, item: any) => sum + (item.pricePerItem * item.quantity), 0);
    const securityTotal = securityItems.reduce((sum: number, item: any) => sum + (item.pricePerItem * item.quantity), 0);
    const accessoryTotal = accessoryItems.reduce((sum: number, item: any) => sum + (item.pricePerItem * item.quantity), 0);
    const totalAmount = gasTotal + securityTotal + accessoryTotal;
    const finalAmount = totalAmount + Number(deliveryCharges);

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
          paymentMethod,
          notes: notes || null
        }
      });

      // Create gas items
      if (gasItems.length > 0) {
        await tx.b2CTransactionGasItem.createMany({
          data: gasItems.map((item: any) => ({
            transactionId: newTransaction.id,
            cylinderType: item.cylinderType,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            totalPrice: item.pricePerItem * item.quantity
          }))
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

      // Create accessory items
      if (accessoryItems.length > 0) {
        await tx.b2CTransactionAccessoryItem.createMany({
          data: accessoryItems.map((item: any) => ({
            transactionId: newTransaction.id,
            itemName: item.itemName,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            totalPrice: item.pricePerItem * item.quantity
          }))
        });
      }

      // Update customer's total profit
      await tx.b2CCustomer.update({
        where: { id: customerId },
        data: {
          totalProfit: {
            increment: totalAmount // Only count item sales, not security deposits
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
