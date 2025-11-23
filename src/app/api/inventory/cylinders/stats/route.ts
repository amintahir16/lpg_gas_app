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

    // Process cylinder type stats dynamically (handles any cylinder type)
    // Note: Exclude WITH_CUSTOMER from inventory totals as they are tracked separately
    // Get all unique cylinder types from the stats
    const uniqueTypes = [...new Set(cylinderTypeStats.map(stat => stat.cylinderType))];
    
    const processedStats = uniqueTypes.map(type => {
      const typeStats = cylinderTypeStats.filter(stat => stat.cylinderType === type);
      const full = typeStats.find(stat => stat.currentStatus === 'FULL')?._count.id || 0;
      const empty = typeStats.find(stat => stat.currentStatus === 'EMPTY')?._count.id || 0;
      const withCustomer = typeStats.find(stat => stat.currentStatus === 'WITH_CUSTOMER')?._count.id || 0;
      const retired = typeStats.find(stat => stat.currentStatus === 'RETIRED')?._count.id || 0;
      
      // Format type name for display (extract weight if available)
      let displayType = type;
      const weightMatch = type.match(/(\d+\.?\d*)/);
      if (weightMatch) {
        const weight = weightMatch[1];
        if (type === 'DOMESTIC_11_8KG') {
          displayType = 'Domestic (11.8kg)';
        } else if (type === 'STANDARD_15KG') {
          displayType = 'Standard (15kg)';
        } else if (type === 'COMMERCIAL_45_4KG') {
          displayType = 'Commercial (45.4kg)';
        } else {
          displayType = `Cylinder (${weight}kg)`;
        }
      } else {
        displayType = type.replace(/_/g, ' ');
      }
      
      return {
        type: displayType,
        typeEnum: type, // Keep original enum for reference
        full,
        empty,
        withCustomer,
        retired,
        // Total only includes cylinders in inventory (excluding WITH_CUSTOMER)
        total: full + empty + retired
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
