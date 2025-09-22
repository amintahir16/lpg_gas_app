import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId');

    const whereClause: any = {
      transactionType: 'BUYBACK',
      voided: false
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Get buyback transactions with details
    const buybackTransactions = await prisma.b2BTransaction.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contactPerson: true
          }
        },
        items: {
          where: {
            buybackTotal: { gt: 0 }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Calculate summary statistics
    const summary = {
      totalBuybackAmount: 0,
      totalCylinders: 0,
      totalTransactions: buybackTransactions.length,
      averageBuybackAmount: 0,
      buybackByType: {
        'Domestic (11.8kg)': { count: 0, amount: 0 },
        'Standard (15kg)': { count: 0, amount: 0 },
        'Commercial (45.4kg)': { count: 0, amount: 0 }
      }
    };

    const transactionDetails = buybackTransactions.map(transaction => {
      const buybackAmount = transaction.totalAmount.toNumber();
      const cylinderCount = transaction.items.reduce((sum, item) => sum + item.quantity.toNumber(), 0);

      summary.totalBuybackAmount += buybackAmount;
      summary.totalCylinders += cylinderCount;

      // Group by cylinder type
      transaction.items.forEach(item => {
        if (item.cylinderType) {
          const type = item.cylinderType as keyof typeof summary.buybackByType;
          if (summary.buybackByType[type]) {
            summary.buybackByType[type].count += item.quantity.toNumber();
            summary.buybackByType[type].amount += item.buybackTotal?.toNumber() || 0;
          }
        }
      });

      return {
        id: transaction.id,
        billSno: transaction.billSno,
        customerName: transaction.customer.name,
        customerContact: transaction.customer.contactPerson,
        date: transaction.date,
        totalAmount: buybackAmount,
        cylinderCount,
        items: transaction.items.map(item => ({
          productName: item.productName,
          cylinderType: item.cylinderType,
          quantity: item.quantity.toNumber(),
          originalSoldPrice: item.originalSoldPrice?.toNumber() || 0,
          buybackRate: item.buybackRate?.toNumber() || 0.60,
          buybackPricePerItem: item.buybackPricePerItem?.toNumber() || 0,
          buybackTotal: item.buybackTotal?.toNumber() || 0,
          returnedCondition: item.returnedCondition,
          remainingKg: item.remainingKg?.toNumber() || null
        }))
      };
    });

    // Calculate average
    if (summary.totalTransactions > 0) {
      summary.averageBuybackAmount = summary.totalBuybackAmount / summary.totalTransactions;
    }

    return NextResponse.json({
      summary,
      transactions: transactionDetails,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error generating buyback report:', error);
    return NextResponse.json(
      { error: 'Failed to generate buyback report' },
      { status: 500 }
    );
  }
}
