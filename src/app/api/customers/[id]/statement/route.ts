import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get transactions within date range
    const whereClause: any = {
      customerId,
      voided: false
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const transactions = await prisma.b2BTransaction.findMany({
      where: whereClause,
      include: {
        items: true
      },
      orderBy: { date: 'asc' }
    });

    // Calculate summary
    const summary = {
      openingBalance: 0, // Would need to calculate based on start date
      totalSales: transactions
        .filter(t => t.transactionType === 'SALE')
        .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0),
      totalPayments: transactions
        .filter(t => t.transactionType === 'PAYMENT')
        .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0),
      totalBuybacks: transactions
        .filter(t => t.transactionType === 'BUYBACK')
        .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0),
      totalAdjustments: transactions
        .filter(t => ['ADJUSTMENT', 'CREDIT_NOTE'].includes(t.transactionType))
        .reduce((sum, t) => sum + t.totalAmount.toNumber(), 0),
      closingBalance: customer.ledgerBalance.toNumber()
    };

    const statementData = {
      customer: {
        id: customer.id,
        name: customer.name,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        paymentTermsDays: customer.paymentTermsDays,
        creditLimit: customer.creditLimit?.toNumber() || 0,
        domestic118kgDue: customer.domestic118kgDue,
        standard15kgDue: customer.standard15kgDue,
        commercial454kgDue: customer.commercial454kgDue
      },
      dateRange: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0]
      },
      summary,
      transactions: transactions.map(t => ({
        id: t.id,
        billSno: t.billSno,
        date: t.date.toISOString().split('T')[0],
        time: t.time.toISOString().split('T')[1].substring(0, 5),
        transactionType: t.transactionType,
        totalAmount: t.totalAmount.toNumber(),
        paymentReference: t.paymentReference,
        notes: t.notes,
        items: t.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity.toNumber(),
          pricePerItem: item.pricePerItem.toNumber(),
          totalPrice: item.totalPrice.toNumber(),
          cylinderType: item.cylinderType
        }))
      })),
      generatedAt: new Date().toISOString(),
      generatedBy: userId
    };

    return NextResponse.json(statementData);

  } catch (error) {
    console.error('Error generating customer statement:', error);
    return NextResponse.json(
      { error: 'Failed to generate customer statement' },
      { status: 500 }
    );
  }
}
