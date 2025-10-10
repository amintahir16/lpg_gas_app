import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Add payment to a purchase
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { purchaseId, amount, paymentMethod, reference, notes } = body;

    if (!purchaseId || !amount) {
      return NextResponse.json(
        { error: 'Purchase ID and amount are required' },
        { status: 400 }
      );
    }

    // Get current purchase
    const purchase = await prisma.vendorPurchase.findUnique({
      where: { id: purchaseId },
      include: { payments: true }
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    const paymentAmount = Number(amount);
    const newPaidAmount = Number(purchase.paidAmount) + paymentAmount;
    const newBalance = Number(purchase.totalAmount) - newPaidAmount;

    let paymentStatus = 'UNPAID';
    if (newBalance <= 0) paymentStatus = 'PAID';
    else if (newPaidAmount > 0) paymentStatus = 'PARTIAL';

    // Create payment and update purchase
    const payment = await prisma.vendorPurchasePayment.create({
      data: {
        purchaseId,
        amount: paymentAmount,
        paymentMethod: paymentMethod || 'CASH',
        reference,
        notes
      }
    });

    await prisma.vendorPurchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalance,
        paymentStatus
      }
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

