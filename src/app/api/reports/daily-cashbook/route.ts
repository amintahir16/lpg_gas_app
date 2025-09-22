import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get all payment transactions for the specified date
    const paymentTransactions = await prisma.b2BTransaction.findMany({
      where: {
        transactionType: 'PAYMENT',
        voided: false,
        date: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z')
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contactPerson: true
          }
        }
      },
      orderBy: { time: 'asc' }
    });

    // Calculate totals
    const totalReceipts = paymentTransactions.reduce((sum, transaction) => 
      sum + transaction.totalAmount.toNumber(), 0
    );

    // Get buyback transactions (cash payments) for the same date
    const buybackTransactions = await prisma.b2BTransaction.findMany({
      where: {
        transactionType: 'BUYBACK',
        voided: false,
        date: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z')
        },
        notes: {
          contains: 'Cash Payment Now'
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contactPerson: true
          }
        }
      },
      orderBy: { time: 'asc' }
    });

    const totalBuybackPayments = buybackTransactions.reduce((sum, transaction) => 
      sum + transaction.totalAmount.toNumber(), 0
    );

    const totalPayments = totalReceipts + totalBuybackPayments;

    // Combine all transactions
    const allTransactions = [
      ...paymentTransactions.map(t => ({
        id: t.id,
        billSno: t.billSno,
        customerName: t.customer.name,
        customerContact: t.customer.contactPerson,
        date: t.date,
        time: t.time,
        transactionType: 'PAYMENT',
        amount: t.totalAmount.toNumber(),
        paymentReference: t.paymentReference,
        notes: t.notes
      })),
      ...buybackTransactions.map(t => ({
        id: t.id,
        billSno: t.billSno,
        customerName: t.customer.name,
        customerContact: t.customer.contactPerson,
        date: t.date,
        time: t.time,
        transactionType: 'BUYBACK_CASH',
        amount: t.totalAmount.toNumber(),
        paymentReference: `BUYBACK-${t.billSno}`,
        notes: t.notes
      }))
    ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return NextResponse.json({
      date,
      summary: {
        totalReceipts,
        totalBuybackPayments,
        totalPayments,
        transactionCount: allTransactions.length
      },
      transactions: allTransactions
    });

  } catch (error) {
    console.error('Error generating daily cashbook report:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily cashbook report' },
      { status: 500 }
    );
  }
}
