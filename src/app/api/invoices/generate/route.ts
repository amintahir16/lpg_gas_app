import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await request.json();

    // Get transaction with customer and items
    const transaction = await prisma.b2BTransaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        items: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Generate invoice data
    const invoiceData = {
      billSno: transaction.billSno,
      date: transaction.date.toISOString().split('T')[0],
      time: transaction.time.toISOString().split('T')[1].substring(0, 5),
      customer: {
        name: transaction.customer.name,
        contactPerson: transaction.customer.contactPerson,
        phone: transaction.customer.phone,
        email: transaction.customer.email,
        address: transaction.customer.address
      },
      transactionType: transaction.transactionType,
      items: transaction.items,
      totalAmount: transaction.totalAmount.toNumber(),
      notes: transaction.notes,
      paymentReference: transaction.paymentReference,
      generatedAt: new Date().toISOString(),
      generatedBy: userId
    };

    return NextResponse.json(invoiceData);

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
