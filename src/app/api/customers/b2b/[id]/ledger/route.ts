import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const { id: customerId } = await params;

    const skip = (page - 1) * limit;

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { marginCategory: true }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build date filter
    const dateWhere: any = { customerId };
    
    if (startDate || endDate) {
      dateWhere.date = {};
      if (startDate) {
        dateWhere.date.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date (up to 23:59:59.999)
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateWhere.date.lte = endDateObj;
      }
    }

    // Get ALL transactions first to calculate running balance correctly
    // If date filter is applied, get all transactions for balance calculation but filtered ones for display
    const allTransactions = await prisma.b2BTransaction.findMany({
      where: { customerId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' }, // Order by creation time ascending for proper running balance calculation
    });

    // Get filtered transactions if date filter is applied
    const filteredTransactions = (startDate || endDate) 
      ? await prisma.b2BTransaction.findMany({
          where: dateWhere,
          include: {
            items: true,
          },
          orderBy: { createdAt: 'asc' },
        })
      : allTransactions;

    // Calculate running balance for each transaction (chronological order)
    // We need to calculate balance based on ALL transactions, but only display filtered ones
    let runningBalance = 0;
    const allTransactionsWithBalance = allTransactions.map((transaction) => {
      // Convert Decimal to number properly
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      
      // Calculate the balance impact of this transaction
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          balanceImpact = totalAmount;
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount;
          break;
        default:
          balanceImpact = 0;
      }
      
      // Update running balance
      runningBalance += balanceImpact;
      
      return {
        ...transaction,
        runningBalance: runningBalance,
        balanceImpact: balanceImpact
      };
    });

    // Now calculate balances for filtered transactions
    // We need to find the starting balance before the first filtered transaction
    let startingBalance = 0;
    if (filteredTransactions.length > 0 && (startDate || endDate)) {
      // Find all transactions before the first filtered transaction
      const firstFilteredDate = new Date(filteredTransactions[0].date);
      const transactionsBeforeFilter = allTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate < firstFilteredDate;
      });
      
      // Calculate balance up to the first filtered transaction
      transactionsBeforeFilter.forEach(transaction => {
        const totalAmount = parseFloat(transaction.totalAmount.toString());
        let balanceImpact = 0;
        switch (transaction.transactionType) {
          case 'SALE':
            balanceImpact = totalAmount;
            break;
          case 'PAYMENT':
          case 'BUYBACK':
          case 'ADJUSTMENT':
          case 'CREDIT_NOTE':
            balanceImpact = -totalAmount;
            break;
        }
        startingBalance += balanceImpact;
      });
    }

    // Calculate running balances for filtered transactions
    let currentBalance = startingBalance;
    const filteredTransactionsWithBalance = filteredTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;
      switch (transaction.transactionType) {
        case 'SALE':
          balanceImpact = totalAmount;
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount;
          break;
      }
      
      currentBalance += balanceImpact;
      
      return {
        ...transaction,
        runningBalance: currentBalance,
        balanceImpact: balanceImpact
      };
    });

    // For display, we want newest first, so reverse
    const reversedTransactions = filteredTransactionsWithBalance.reverse();
    let displayBalance = currentBalance; // Start with the final balance
    
    const displayTransactions = reversedTransactions.map((transaction) => {
      // Move to the balance before this transaction first
      displayBalance -= transaction.balanceImpact;
      
      // The running balance for this transaction is the balance AFTER it
      const result = {
        ...transaction,
        runningBalance: displayBalance + transaction.balanceImpact
      };
      
      return result;
    });

    // Apply pagination
    const paginatedTransactions = displayTransactions.slice(skip, skip + limit);
    const total = filteredTransactions.length;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      customer,
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer ledger' },
      { status: 500 }
    );
  }
}
