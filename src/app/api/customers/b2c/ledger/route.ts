import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all B2C customers with their profit data
    const [customers, profitSummary, totalCustomers] = await Promise.all([
      prisma.b2CCustomer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          houseNumber: true,
          sector: true,
          street: true,
          phase: true,
          area: true,
          city: true,
          totalProfit: true,
          googleMapLocation: true
        },
        orderBy: { totalProfit: 'desc' }
      }),
      prisma.b2CCustomer.aggregate({
        _sum: { totalProfit: true }
      }),
      prisma.b2CCustomer.count()
    ]);

    const response = {
      customers,
      totalProfit: Number(profitSummary._sum.totalProfit || 0),
      totalCustomers
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching B2C ledger data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch B2C ledger data' },
      { status: 500 }
    );
  }
}
