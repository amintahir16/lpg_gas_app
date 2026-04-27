import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const cylindersWithCustomers = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'typeName', 'capacity'],
      where: {
        currentStatus: 'WITH_CUSTOMER',
        ...regionScopedWhere(regionId),
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
      typeName: stat.typeName,
      capacity: Number(stat.capacity),
      count: stat._count.id,
      totalValue: stat._sum.purchasePrice || 0
    })).sort((a, b) => a.capacity - b.capacity);

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
