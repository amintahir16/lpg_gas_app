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

    // Get ALL transactions first to calculate running balance correctly
    const allTransactions = await prisma.b2BTransaction.findMany({
      where: { customerId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' }, // Order by creation time ascending for proper running balance calculation
    });

    // Calculate running balance for each transaction (chronological order)
    let runningBalance = 0;
    const transactionsWithRunningBalance = allTransactions.map((transaction) => {
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

    // For display, we want newest first, so we need to recalculate running balance
    // working backwards from the final balance
    const reversedTransactions = transactionsWithRunningBalance.reverse();
    let displayBalance = runningBalance; // Start with the final balance
    
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
    const total = allTransactions.length;
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
