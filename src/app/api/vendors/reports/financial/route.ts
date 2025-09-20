import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const period = searchParams.get('period') || 'monthly'; // daily, monthly, yearly
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    // Calculate date range based on period
    let dateFilter: Prisma.DateTimeFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      const now = new Date();
      switch (period) {
        case 'daily':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateFilter = {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          };
          break;
        case 'monthly':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          dateFilter = {
            gte: monthStart,
            lt: monthEnd
          };
          break;
        case 'yearly':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
          dateFilter = {
            gte: yearStart,
            lt: yearEnd
          };
          break;
      }
    }

    // Get purchase entries for the period
    const purchaseEntries = await prisma.purchaseEntry.findMany({
      where: {
        vendorId,
        purchaseDate: dateFilter,
        status: 'CONFIRMED'
      },
      orderBy: { purchaseDate: 'desc' }
    });

    // Get payments for the period
    const payments = await prisma.vendorPayment.findMany({
      where: {
        vendorId,
        paymentDate: dateFilter,
        status: 'COMPLETED'
      },
      orderBy: { paymentDate: 'desc' }
    });

    // Calculate totals
    const totalPurchases = purchaseEntries.reduce((sum, entry) => sum + Number(entry.totalPrice), 0);
    const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    
    // Get the latest financial report
    const latestReport = await prisma.vendorFinancialReport.findFirst({
      where: { vendorId },
      orderBy: { reportDate: 'desc' }
    });

    // Calculate net balance
    const previousBalance = latestReport ? Number(latestReport.netBalance) : 0;
    const netBalance = previousBalance + totalPurchases - totalPayments;

    // Get vendor details
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        vendorCode: true,
        companyName: true,
        category: true
      }
    });

    const financialReport = {
      vendor,
      period,
      dateRange: {
        start: dateFilter.gte,
        end: dateFilter.lte
      },
      summary: {
        previousBalance,
        cashIn: totalPayments,
        cashOut: totalPurchases,
        netBalance
      },
      transactions: {
        purchases: purchaseEntries,
        payments
      },
      totalTransactions: purchaseEntries.length + payments.length
    };

    return NextResponse.json(financialReport);
  } catch (error) {
    console.error('Financial report fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial report' },
      { status: 500 }
    );
  }
}
