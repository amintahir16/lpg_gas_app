import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin, clampLimit } from '@/lib/apiAuth';
import { sortTransactionsNewestFirst } from '@/lib/transaction-display-sort';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 20);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const { id: customerId } = await params;

    const skip = (page - 1) * limit;

    const customer = await prisma.b2CCustomer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
      include: {
        marginCategory: true,
        cylinderHoldings: {
          where: { isReturned: false },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Lean headers for lifetime summary + sort/paginate (no nested line items).
    const leanTransactions = await prisma.b2CTransaction.findMany({
      where: { customerId },
      select: {
        id: true,
        date: true,
        time: true,
        billSno: true,
        createdAt: true,
        voided: true,
        finalAmount: true,
        actualProfit: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const securitySums = await prisma.b2CTransactionSecurityItem.groupBy({
      by: ['transactionId'],
      where: { transaction: { customerId } },
      _sum: { totalPrice: true },
    });
    const securityByTx = new Map(
      securitySums.map((row) => [row.transactionId, Number(row._sum.totalPrice || 0)])
    );

    let totalIn = 0;
    let totalOut = 0;
    let totalProfit = 0;
    let nonVoidedCount = 0;

    leanTransactions.forEach((tx) => {
      if (tx.voided) return;
      nonVoidedCount += 1;
      const finalAmount = parseFloat(tx.finalAmount.toString());
      const profit = parseFloat(tx.actualProfit.toString());
      const securityTotal = securityByTx.get(tx.id) || 0;
      const salesAmount = finalAmount - securityTotal;
      totalOut += salesAmount;
      totalIn += salesAmount;
      totalProfit += profit;
    });

    let displayTransactions = leanTransactions;
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date(9999, 11, 31);
      if (endDate) end.setHours(23, 59, 59, 999);
      displayTransactions = leanTransactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
    }

    const sortedDisplayTransactions = sortTransactionsNewestFirst(displayTransactions);
    const pageLean = sortedDisplayTransactions.slice(skip, skip + limit);
    const pageIds = pageLean.map((t) => t.id);

    const pageFull =
      pageIds.length > 0
        ? await prisma.b2CTransaction.findMany({
            where: { id: { in: pageIds } },
            include: {
              gasItems: true,
              accessoryItems: true,
              securityItems: true,
            },
          })
        : [];
    const fullById = new Map(pageFull.map((t) => [t.id, t]));
    const paginatedTransactions = pageLean
      .map((lean) => fullById.get(lean.id))
      .filter(Boolean);

    const totalCount = displayTransactions.length;
    const pages = Math.ceil(totalCount / limit);

    const totalSecurityHeld = customer.cylinderHoldings.reduce((sum, holding) => {
      const qty = holding.quantity;
      const amt = parseFloat(holding.securityAmount.toString());
      return sum + qty * amt;
    }, 0);

    return NextResponse.json({
      customer,
      transactions: paginatedTransactions,
      summary: {
        netBalance: 0,
        totalTransactions: nonVoidedCount,
        totalIn,
        totalOut,
        totalProfit,
        totalSecurityHeld,
        cylinderHoldingsCount: customer.cylinderHoldings.reduce(
          (acc, curr) => acc + curr.quantity,
          0
        ),
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching B2C customer ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer ledger' },
      { status: 500 }
    );
  }
}
