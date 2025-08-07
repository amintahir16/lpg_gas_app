import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Expect: customerId, amount, description
    const { customerId, amount, description } = data;
    if (!customerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const payment = await prisma.customerLedger.create({
      data: {
        customerId,
        transactionType: 'PAYMENT',
        amount,
        balanceBefore: 0, // For demo, set to 0
        balanceAfter: 0, // For demo, set to 0
        description,
      },
    });
    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}