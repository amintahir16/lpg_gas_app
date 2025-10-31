import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get cylinders with customers by type
    const cylindersWithCustomers = await prisma.cylinder.groupBy({
      by: ['cylinderType'],
      where: {
        currentStatus: 'WITH_CUSTOMER'
      },
      _count: {
        id: true
      },
      _sum: {
        purchasePrice: true
      }
    });

    // Process the stats
    const stats = cylindersWithCustomers.map(stat => ({
      type: stat.cylinderType,
      count: stat._count.id,
      totalValue: stat._sum.purchasePrice || 0
    }));

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching customer cylinder stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer cylinder stats' },
      { status: 500 }
    );
  }
}
