import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For customer payments, we need to get the customer ID from the user
    const customer = await prisma.customer.findFirst({
      where: { userId: userId }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get customer ledger entries (payments)
    const [payments, total] = await Promise.all([
      prisma.customerLedger.findMany({
        where: { 
          customerId: customer.id,
          transactionType: 'PAYMENT'
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customerLedger.count({
        where: { 
          customerId: customer.id,
          transactionType: 'PAYMENT'
        }
      })
    ]);

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      date: payment.createdAt.toISOString().split('T')[0],
      amount: payment.amount,
      method: 'Bank Transfer', // Default method since we don't store this in ledger
      status: 'Completed'
    }));

    return NextResponse.json({
      payments: formattedPayments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Customer payments fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer payments' },
      { status: 500 }
    );
  }
} 