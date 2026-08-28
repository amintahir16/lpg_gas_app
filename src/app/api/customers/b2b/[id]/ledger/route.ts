import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adoptLegacyB2bCustomerIfNeeded, getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin, clampLimit } from '@/lib/apiAuth';
import { parseCylinderVariantKey } from '@/lib/cylinder-variant-key';
import { isOpeningDuesSaleItem, isOpeningDuesTransaction } from '@/lib/b2b-opening-entries';
import { calculateGasLineProfit } from '@/lib/gas-profit';
import { getCapacityFromTypeString } from '@/lib/cylinder-utils';
import { compareTransactionsNewestFirst } from '@/lib/transaction-display-sort';

function saleBalanceImpact(transaction: {
  voided: boolean;
  paymentStatus: string | null;
  unpaidAmount: { toString(): string } | null;
  totalAmount: { toString(): string };
  paidAmount?: { toString(): string } | null;
}): number {
  if (transaction.voided) return 0;
  const totalAmount = parseFloat(transaction.totalAmount.toString());
  if (transaction.paidAmount !== null && transaction.paidAmount !== undefined) {
    const paid = parseFloat(transaction.paidAmount.toString());
    return totalAmount - paid;
  }
  if (transaction.paymentStatus === 'FULLY_PAID') return 0;
  if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
    return parseFloat(transaction.unpaidAmount.toString());
  }
  return totalAmount;
}

function creditBalanceImpact(transaction: {
  voided: boolean;
  totalAmount: { toString(): string };
}): number {
  const totalAmount = parseFloat(transaction.totalAmount.toString());
  return transaction.voided ? 0 : -totalAmount;
}

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

    await adoptLegacyB2bCustomerIfNeeded(customerId, regionId);

    // Get customer details (region-scoped)
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, type: 'B2B', ...regionScopedWhere(regionId) },
      include: { marginCategory: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Lean full timeline for running balance + lifetime in/out (no line items).
    const leanTransactions = await prisma.b2BTransaction.findMany({
      where: { customerId },
      select: {
        id: true,
        transactionType: true,
        billSno: true,
        customerId: true,
        date: true,
        time: true,
        totalAmount: true,
        paidAmount: true,
        unpaidAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentReference: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        voided: true,
        voidedBy: true,
        voidedAt: true,
        voidReason: true,
        regionId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const filterStart = startDate ? new Date(startDate) : null;
    const filterEnd = endDate
      ? (() => {
          const d = new Date(endDate);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      : null;

    const filteredTransactions = filterStart || filterEnd
      ? leanTransactions.filter((t) => {
          const d = new Date(t.date);
          if (filterStart && d < filterStart) return false;
          if (filterEnd && d > filterEnd) return false;
          return true;
        })
      : leanTransactions;

    let runningBalance = 0;
    const allTransactionsWithBalance = leanTransactions.map((transaction) => {
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          balanceImpact = saleBalanceImpact(transaction);
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = creditBalanceImpact(transaction);
          break;
        default:
          balanceImpact = 0;
      }
      runningBalance += balanceImpact;
      return { ...transaction, runningBalance, balanceImpact };
    });

    let startingBalance = 0;
    if (filteredTransactions.length > 0 && (startDate || endDate)) {
      const firstFilteredCreatedAt = filteredTransactions[0].createdAt;
      startingBalance = allTransactionsWithBalance
        .filter((t) => t.createdAt < firstFilteredCreatedAt)
        .reduce((sum, t) => sum + (t.balanceImpact || 0), 0);
    }

    let currentBalance = startingBalance;
    const filteredTransactionsWithBalance = filteredTransactions.map((transaction) => {
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          balanceImpact = saleBalanceImpact(transaction);
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = creditBalanceImpact(transaction);
          break;
      }
      currentBalance += balanceImpact;
      return { ...transaction, runningBalance: currentBalance, balanceImpact };
    });

    const reversedTransactions = [...filteredTransactionsWithBalance].sort(
      compareTransactionsNewestFirst
    );
    let displayBalance = currentBalance;

    const displayTransactions = reversedTransactions.map((transaction) => {
      displayBalance -= transaction.balanceImpact;
      return {
        ...transaction,
        runningBalance: displayBalance + transaction.balanceImpact,
      };
    });

    // Lifetime totals — sale profit needs line items only (not every page).
    let totalIn = 0;
    let totalOut = 0;
    let totalProfit = 0;

    leanTransactions.forEach((transaction) => {
      if (transaction.voided) return;
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      switch (transaction.transactionType) {
        case 'SALE':
          if (isOpeningDuesTransaction(transaction)) break;
          totalOut += totalAmount;
          if (transaction.paidAmount) {
            totalIn += parseFloat(transaction.paidAmount.toString());
          }
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          totalIn += totalAmount;
          break;
      }
    });

    const saleItems = await prisma.b2BTransactionItem.findMany({
      where: {
        transaction: {
          customerId,
          voided: false,
          transactionType: 'SALE',
        },
      },
      select: {
        quantity: true,
        pricePerItem: true,
        costPrice: true,
        cylinderType: true,
        cylinderVariantKey: true,
        transaction: {
          select: {
            notes: true,
            paymentReference: true,
            totalAmount: true,
            transactionType: true,
          },
        },
      },
    });

    saleItems.forEach((item) => {
      if (isOpeningDuesSaleItem(item.transaction, item)) return;
      if (item.cylinderType) {
        let capacity = 15;
        const parsedVk = item.cylinderVariantKey
          ? parseCylinderVariantKey(item.cylinderVariantKey)
          : null;
        if (
          parsedVk?.capacity !== null &&
          parsedVk?.capacity !== undefined &&
          Number.isFinite(parsedVk.capacity)
        ) {
          capacity = parsedVk.capacity;
        } else {
          const fromType = getCapacityFromTypeString(item.cylinderType);
          if (fromType > 0) capacity = fromType;
        }
        const quantity = parseFloat(item.quantity.toString());
        const sellingPrice = parseFloat(item.pricePerItem.toString()) || 0;
        const costPrice = item.costPrice ? parseFloat(item.costPrice.toString()) : 0;
        const marginPerKg = customer.marginCategory
          ? parseFloat(customer.marginCategory.marginPerKg.toString())
          : 0;
        totalProfit += calculateGasLineProfit({
          pricePerItem: sellingPrice,
          quantity,
          costPrice,
          capacityKg: capacity,
          marginPerKg,
        });
      } else {
        const sellingPrice = parseFloat(item.pricePerItem.toString()) || 0;
        let costPrice = item.costPrice ? parseFloat(item.costPrice.toString()) : 0;
        if (costPrice === 0 && sellingPrice > 0) {
          totalProfit += sellingPrice * 0.2 * parseFloat(item.quantity.toString());
        } else {
          totalProfit += (sellingPrice - costPrice) * parseFloat(item.quantity.toString());
        }
      }
    });

    const netBalance = -customer.ledgerBalance.toNumber();

    const pageLean = displayTransactions.slice(skip, skip + limit);
    const pageIds = pageLean.map((t) => t.id);
    const pageFull =
      pageIds.length > 0
        ? await prisma.b2BTransaction.findMany({
            where: { id: { in: pageIds } },
            include: { items: true },
          })
        : [];
    const fullById = new Map(pageFull.map((t) => [t.id, t]));
    const paginatedTransactions = pageLean.map((lean) => {
      const full = fullById.get(lean.id);
      return {
        ...(full || lean),
        runningBalance: lean.runningBalance,
        balanceImpact: lean.balanceImpact,
      };
    });

    const total = filteredTransactions.length;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      customer,
      transactions: paginatedTransactions,
      summary: {
        netBalance,
        totalIn,
        totalOut,
        totalProfit,
        ledgerBalance: customer.ledgerBalance.toNumber(),
      },
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching B2B customer ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer ledger' },
      { status: 500 }
    );
  }
}
