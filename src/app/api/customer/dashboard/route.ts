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

    // For customer dashboard, we need to get the customer ID from the user
    const customer = await prisma.customer.findFirst({
      where: { userId: userId }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get customer statistics
    const [activeRentals, totalRentals, totalSpent, accountBalance] = await Promise.all([
      // Active rentals
      prisma.cylinderRental.count({
        where: { 
          customerId: customer.id,
          status: 'ACTIVE'
        }
      }),
      // Total rentals
      prisma.cylinderRental.count({
        where: { customerId: customer.id }
      }),
      // Total spent (sum of all rental amounts)
      prisma.cylinderRental.aggregate({
        where: { customerId: customer.id },
        _sum: { rentalAmount: true }
      }),
      // Account balance (from customer ledger)
      prisma.customerLedger.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true }
      })
    ]);

    const stats = {
      activeRentals,
      totalRentals,
      totalSpent: Number(totalSpent._sum.rentalAmount) || 0,
      accountBalance: Number(accountBalance?.balanceAfter) || 0
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Customer dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer dashboard stats' },
      { status: 500 }
    );
  }
} 