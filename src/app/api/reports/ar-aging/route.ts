import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];

    // Get all customers with outstanding balances
    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        ledgerBalance: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        ledgerBalance: true,
        paymentTermsDays: true,
        createdAt: true,
        transactions: {
          where: {
            transactionType: 'SALE',
            voided: false,
            date: { lte: new Date(asOfDate) }
          },
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            date: true,
            totalAmount: true
          }
        }
      }
    });

    // Calculate aging buckets
    const agingData = customers.map(customer => {
      const lastTransactionDate = customer.transactions[0]?.date || customer.createdAt;
      const daysSinceLastTransaction = Math.floor(
        (new Date(asOfDate).getTime() - new Date(lastTransactionDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      let agingBucket = '0-30';
      if (daysSinceLastTransaction > 90) {
        agingBucket = '>90';
      } else if (daysSinceLastTransaction > 60) {
        agingBucket = '61-90';
      } else if (daysSinceLastTransaction > 30) {
        agingBucket = '31-60';
      }

      return {
        ...customer,
        daysSinceLastTransaction,
        agingBucket,
        ledgerBalance: customer.ledgerBalance.toNumber()
      };
    });

    // Group by aging buckets
    const agingSummary = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '>90': { count: 0, amount: 0 }
    };

    agingData.forEach(customer => {
      agingSummary[customer.agingBucket as keyof typeof agingSummary].count++;
      agingSummary[customer.agingBucket as keyof typeof agingSummary].amount += customer.ledgerBalance;
    });

    // Calculate totals
    const totalOutstanding = agingData.reduce((sum, customer) => sum + customer.ledgerBalance, 0);
    const totalCustomers = agingData.length;

    // Get top 10 debtors
    const topDebtors = agingData
      .sort((a, b) => b.ledgerBalance - a.ledgerBalance)
      .slice(0, 10);

    return NextResponse.json({
      asOfDate,
      summary: {
        totalOutstanding,
        totalCustomers,
        agingSummary
      },
      topDebtors,
      agingDetails: agingData
    });

  } catch (error) {
    console.error('Error generating AR Aging report:', error);
    return NextResponse.json(
      { error: 'Failed to generate AR Aging report' },
      { status: 500 }
    );
  }
}
