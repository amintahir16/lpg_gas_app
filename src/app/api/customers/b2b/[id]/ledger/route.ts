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
    // Net Balance = Total Out - Total In (negative when customer owes)
    let runningBalance = 0;

    const allTransactionsWithBalance = allTransactions.map((transaction) => {
      // Convert Decimal to number properly
      const totalAmount = parseFloat(transaction.totalAmount.toString());

      // Calculate the balance impact of this transaction
      let balanceImpact = 0;

      switch (transaction.transactionType) {
        case 'SALE':
          // For SALE transactions, only unpaid amount affects balance
          // Check if paymentStatus is FULLY_PAID first (new format)
          if (transaction.paymentStatus === 'FULLY_PAID') {
            // Fully paid sale - zero balance impact
            balanceImpact = 0;
          } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
            // New format with unpaidAmount field
            balanceImpact = parseFloat(transaction.unpaidAmount.toString());
          } else {
            // Old transaction format - no payment info, assume fully unpaid
            balanceImpact = totalAmount;
          }
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount; // Decreases what customer owes (less negative)
          break;
        default:
          balanceImpact = 0;
      }

      // Update running balance (negative when customer owes)
      runningBalance += balanceImpact;

      return {
        ...transaction,
        runningBalance: runningBalance, // This is positive (Sales - Payments), we'll negate for display
        balanceImpact: balanceImpact
      };
    });

    // Now calculate balances for filtered transactions
    // We need to find the starting balance before the first filtered transaction
    let startingBalance = 0;
    if (filteredTransactions.length > 0 && (startDate || endDate)) {
      // Use balance impacts already calculated in allTransactionsWithBalance
      // They already use the correct unpaidAmount logic
      const firstFilteredCreatedAt = filteredTransactions[0].createdAt;
      const transactionsBeforeFilterWithBalance = allTransactionsWithBalance.filter(t =>
        t.createdAt < firstFilteredCreatedAt
      );

      // Sum up the balance impacts (already calculated correctly with unpaidAmount logic)
      startingBalance = transactionsBeforeFilterWithBalance.reduce((sum, t) => sum + (t.balanceImpact || 0), 0);
    }

    // Calculate running balances for filtered transactions
    // currentBalance is positive (Sales - Payments), we negate for display
    let currentBalance = startingBalance;
    const filteredTransactionsWithBalance = filteredTransactions.map((transaction) => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      let balanceImpact = 0;

      switch (transaction.transactionType) {
        case 'SALE':
          // For SALE transactions, only unpaid amount affects balance
          if (transaction.paymentStatus === 'FULLY_PAID') {
            balanceImpact = 0; // Fully paid sale - zero impact
          } else if (transaction.unpaidAmount !== null && transaction.unpaidAmount !== undefined) {
            balanceImpact = parseFloat(transaction.unpaidAmount.toString());
          } else {
            balanceImpact = totalAmount; // Old format - assume fully unpaid
          }
          break;
        case 'PAYMENT':
        case 'BUYBACK':
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          balanceImpact = -totalAmount; // Decreases what customer owes
          break;
      }

      currentBalance += balanceImpact;

      return {
        ...transaction,
        runningBalance: currentBalance, // Positive (Sales - Payments), frontend will negate
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

    // Calculate Total In, Total Out, and Total Profit for ALL transactions
    let totalIn = 0; // Payments received (reduces what customer owes)
    let totalOut = 0; // Sales made (increases what customer owes)
    let totalProfit = 0; // Total profit from all sales

    allTransactions.forEach(transaction => {
      const totalAmount = parseFloat(transaction.totalAmount.toString());
      switch (transaction.transactionType) {
        case 'SALE':
          totalOut += totalAmount;
          // Include partial payments made at sale time in Total In
          if (transaction.paidAmount) {
            const paidAmount = parseFloat(transaction.paidAmount.toString());
            totalIn += paidAmount;
          }

          // Calculate Profit for this transaction
          if (transaction.items && transaction.items.length > 0) {
            transaction.items.forEach(item => {
              // 1. Gas Profit Calculation
              if (item.cylinderType) {
                // Profit = Margin Per Kg * Cylinder Capacity * Quantity
                // Note: We use the customer's CURRENT margin category as historical margin isn't stored on items
                // This is a known limitation accepted in the plan
                if (customer.marginCategory) {
                  const marginPerKg = parseFloat(customer.marginCategory.marginPerKg.toString());
                  // Helper function logic inlined/adapted since we can't easily import generic utils in API route without potential path issues
                  // But we can try to use the cylinder-utils if available, or regex parse
                  let capacity = 15; // Default fallback

                  // Extract capacity from cylinderType string (e.g. DOMESTIC_11_8KG -> 11.8)
                  const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                  if (match) {
                    const whole = match[1];
                    const decimal = match[2];
                    capacity = decimal ? parseFloat(`${whole}.${decimal}`) : parseFloat(whole);
                  }

                  const quantity = parseFloat(item.quantity.toString());
                  const itemProfit = marginPerKg * capacity * quantity;
                  totalProfit += itemProfit;
                }
              }
              // 2. Accessory Profit Calculation
              else {
                // Profit = (Selling Price - Cost Price) * Quantity
                const sellingPrice = parseFloat(item.pricePerItem.toString()) || 0; // pricePerItem is selling price
                // Use costPrice field if available, otherwise check regular cost logic
                let costPrice = item.costPrice ? parseFloat(item.costPrice.toString()) : 0;

                // If cost price is 0 (missing), assume 20% default margin
                if (costPrice === 0 && sellingPrice > 0) {
                  // Default 20% margin means Profit = 20% of Selling Price
                  const itemProfit = sellingPrice * 0.20 * parseFloat(item.quantity.toString());
                  totalProfit += itemProfit;
                } else {
                  // Standard profit calculation
                  const profitPerItem = sellingPrice - costPrice;
                  const itemProfit = profitPerItem * parseFloat(item.quantity.toString());
                  totalProfit += itemProfit;
                }
              }
            });
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

    // Net Balance = Total Out - Total In (negative when customer owes)
    // Current ledgerBalance = Sales - Payments, so we need to negate it for display
    const netBalance = -(customer.ledgerBalance.toNumber());

    // Apply pagination
    const paginatedTransactions = displayTransactions.slice(skip, skip + limit);
    const total = filteredTransactions.length;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      customer,
      transactions: paginatedTransactions,
      summary: {
        netBalance, // Negative when customer owes, positive when customer has credit
        totalIn, // Payments received
        totalOut, // Sales made
        totalProfit, // Total profit calcualted
        ledgerBalance: customer.ledgerBalance.toNumber() // Keep original for internal calculations
      },
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
