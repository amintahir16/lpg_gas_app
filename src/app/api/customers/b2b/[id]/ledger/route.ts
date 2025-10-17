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

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      prisma.b2BTransaction.findMany({
        where: { customerId },
        include: {
          items: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.b2BTransaction.count({ where: { customerId } }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      customer,
      transactions,
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
