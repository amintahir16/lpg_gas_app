import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    switch (reportType) {
      case 'ar-summary':
        return await getARSummary(regionScope);
      
      case 'cylinder-due':
        return await getCylinderDueReport(regionScope);
      
      case 'buyback':
        return await getBuybackReport(dateFilter, regionScope);
      
      case 'inventory':
        return await getInventoryReport(regionScope);
      
      case 'sales':
        return await getSalesReport(dateFilter, regionScope);
      
      case 'daily-cashbook':
        return await getDailyCashbookReport(dateFilter, regionScope);
      
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function getARSummary(regionScope: any) {
  // Get total outstanding (region-scoped)
  const totalOutstanding = await prisma.customer.aggregate({
    where: { ledgerBalance: { gt: 0 }, ...regionScope },
    _sum: { ledgerBalance: true },
  });

  // Get top 10 debtors (region-scoped)
  const topDebtors = await prisma.customer.findMany({
    where: { ledgerBalance: { gt: 0 }, ...regionScope },
    orderBy: { ledgerBalance: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      ledgerBalance: true,
    },
  });

  // Get aging analysis
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const agingData = await Promise.all([
    // 0-30 days
    prisma.b2BTransaction.aggregate({
      where: {
        transactionType: 'SALE',
        date: { gte: thirtyDaysAgo },
        voided: false,
        ...regionScope,
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // 31-60 days
    prisma.b2BTransaction.aggregate({
      where: {
        transactionType: 'SALE',
        date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        voided: false,
        ...regionScope,
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // 61-90 days
    prisma.b2BTransaction.aggregate({
      where: {
        transactionType: 'SALE',
        date: { gte: ninetyDaysAgo, lt: sixtyDaysAgo },
        voided: false,
        ...regionScope,
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // >90 days
    prisma.b2BTransaction.aggregate({
      where: {
        transactionType: 'SALE',
        date: { lt: ninetyDaysAgo },
        voided: false,
        ...regionScope,
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    totalOutstanding: totalOutstanding._sum.ledgerBalance || 0,
    topDebtors,
    aging: {
      '0-30': { amount: agingData[0]._sum.totalAmount || 0, count: agingData[0]._count },
      '31-60': { amount: agingData[1]._sum.totalAmount || 0, count: agingData[1]._count },
      '61-90': { amount: agingData[2]._sum.totalAmount || 0, count: agingData[2]._count },
      '90+': { amount: agingData[3]._sum.totalAmount || 0, count: agingData[3]._count },
    },
  });
}

async function getCylinderDueReport(regionScope: any) {
  const customersWithDue = await prisma.customer.findMany({
    where: {
      OR: [
        { domestic118kgDue: { gt: 0 } },
        { standard15kgDue: { gt: 0 } },
        { commercial454kgDue: { gt: 0 } },
      ],
      ...regionScope,
    },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      domestic118kgDue: true,
      standard15kgDue: true,
      commercial454kgDue: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ customers: customersWithDue });
}

async function getBuybackReport(dateFilter: any, regionScope: any) {
  const buybacks = await prisma.b2BTransaction.findMany({
    where: {
      transactionType: 'BUYBACK',
      ...dateFilter,
      voided: false,
      ...regionScope,
    },
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
    orderBy: { date: 'desc' },
  });

  return NextResponse.json({ buybacks });
}

async function getInventoryReport(regionScope: any) {
  const inventory = await prisma.product.findMany({
    where: { isActive: true, ...regionScope },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ inventory });
}

async function getSalesReport(dateFilter: any, regionScope: any) {
  const sales = await prisma.b2BTransaction.findMany({
    where: {
      transactionType: 'SALE',
      ...dateFilter,
      voided: false,
      ...regionScope,
    },
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
    orderBy: { date: 'desc' },
  });

  return NextResponse.json({ sales });
}

async function getDailyCashbookReport(dateFilter: any, regionScope: any) {
  const payments = await prisma.b2BTransaction.findMany({
    where: {
      transactionType: 'PAYMENT',
      ...dateFilter,
      voided: false,
      ...regionScope,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          contactPerson: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  const totalPayments = await prisma.b2BTransaction.aggregate({
    where: {
      transactionType: 'PAYMENT',
      ...dateFilter,
      voided: false,
      ...regionScope,
    },
    _sum: { totalAmount: true },
  });

  return NextResponse.json({
    payments,
    totalAmount: totalPayments._sum.totalAmount || 0,
  });
}
