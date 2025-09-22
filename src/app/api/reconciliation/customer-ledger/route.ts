import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        ledgerBalance: true
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get all transactions up to the specified date
    const transactions = await prisma.b2BTransaction.findMany({
      where: {
        customerId,
        voided: false,
        date: { lte: new Date(asOfDate + 'T23:59:59.999Z') }
      },
      include: {
        items: true
      },
      orderBy: { date: 'asc' }
    });

    // Calculate running balance
    let runningBalance = 0;
    const reconciliationData = transactions.map(transaction => {
      let transactionAmount = 0;
      
      switch (transaction.transactionType) {
        case 'SALE':
          transactionAmount = transaction.totalAmount.toNumber();
          runningBalance += transactionAmount;
          break;
        case 'PAYMENT':
          transactionAmount = -transaction.totalAmount.toNumber();
          runningBalance += transactionAmount;
          break;
        case 'BUYBACK':
          transactionAmount = -transaction.totalAmount.toNumber();
          runningBalance += transactionAmount;
          break;
        case 'ADJUSTMENT':
        case 'CREDIT_NOTE':
          transactionAmount = -transaction.totalAmount.toNumber();
          runningBalance += transactionAmount;
          break;
        case 'RETURN_EMPTY':
          // No ledger impact
          transactionAmount = 0;
          break;
      }

      return {
        transactionId: transaction.id,
        billSno: transaction.billSno,
        date: transaction.date,
        time: transaction.time,
        transactionType: transaction.transactionType,
        totalAmount: transaction.totalAmount.toNumber(),
        transactionAmount,
        balanceAfter: runningBalance,
        items: transaction.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity.toNumber(),
          pricePerItem: item.pricePerItem.toNumber(),
          totalPrice: item.totalPrice.toNumber(),
          cylinderType: item.cylinderType
        })),
        notes: transaction.notes,
        paymentReference: transaction.paymentReference
      };
    });

    // Calculate totals
    const totalSales = transactions
      .filter(t => t.transactionType === 'SALE')
      .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0);

    const totalPayments = transactions
      .filter(t => t.transactionType === 'PAYMENT')
      .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0);

    const totalBuybacks = transactions
      .filter(t => t.transactionType === 'BUYBACK')
      .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0);

    const totalAdjustments = transactions
      .filter(t => ['ADJUSTMENT', 'CREDIT_NOTE'].includes(t.transactionType))
      .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0);

    const calculatedBalance = totalSales - totalPayments - totalBuybacks + totalAdjustments;
    const systemBalance = customer.ledgerBalance.toNumber();
    const difference = systemBalance - calculatedBalance;

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        systemLedgerBalance: systemBalance
      },
      asOfDate,
      summary: {
        totalSales,
        totalPayments,
        totalBuybacks,
        totalAdjustments,
        calculatedBalance,
        systemBalance,
        difference,
        isBalanced: Math.abs(difference) < 0.01 // Allow for small rounding differences
      },
      transactions: reconciliationData,
      lastTransaction: reconciliationData[reconciliationData.length - 1] || null
    });

  } catch (error) {
    console.error('Error reconciling customer ledger:', error);
    return NextResponse.json(
      { error: 'Failed to reconcile customer ledger' },
      { status: 500 }
    );
  }
}
