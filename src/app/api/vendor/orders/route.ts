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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.vendorOrder.findMany({
        skip,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: {
          vendor: true
        }
      }),
      prisma.vendorOrder.count()
    ]);

    const formattedOrders = orders.map(order => ({
      id: order.id,
      date: order.orderDate.toISOString().split('T')[0],
      status: order.status,
      amount: order.totalAmount,
      vendor: order.vendor.companyName
    }));

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Vendor orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor orders' },
      { status: 500 }
    );
  }
} 