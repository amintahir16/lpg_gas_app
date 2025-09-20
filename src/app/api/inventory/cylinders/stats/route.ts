import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get cylinder type stats
    const cylinderTypeStats = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'currentStatus'],
      _count: {
        id: true
      }
    });

    // Process cylinder type stats
    const processedStats = ['DOMESTIC_11_8KG', 'STANDARD_15KG', 'COMMERCIAL_45_4KG'].map(type => {
      const typeStats = cylinderTypeStats.filter(stat => stat.cylinderType === type);
      const full = typeStats.find(stat => stat.currentStatus === 'FULL')?._count.id || 0;
      const empty = typeStats.find(stat => stat.currentStatus === 'EMPTY')?._count.id || 0;
      
      return {
        type: type.replace('_', ' '),
        full,
        empty,
        total: full + empty
      };
    });

    return NextResponse.json({
      success: true,
      stats: processedStats
    });
  } catch (error) {
    console.error('Error fetching cylinder type stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cylinder type stats' },
      { status: 500 }
    );
  }
}
