import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

export async function GET(request: NextRequest) {
  try {
    // Get cylinder type stats
    // Exclude WITH_CUSTOMER cylinders from inventory stats
    // Group by typeName, capacity, and cylinderType to distinguish custom types
    const cylinderTypeStats = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'currentStatus', 'typeName', 'capacity'],
      where: {
        currentStatus: {
          not: 'WITH_CUSTOMER'
        }
      },
      _count: {
        id: true
      }
    });

    // Process cylinder type stats dynamically (handles any cylinder type)
    // Note: Exclude WITH_CUSTOMER from inventory totals as they are tracked separately
    // Create unique combinations of typeName + capacity + cylinderType
    // Use a delimiter that won't conflict with data (|||)
    const uniqueCombinations = [...new Set(
      cylinderTypeStats.map(stat => 
        `${stat.cylinderType}|||${stat.capacity?.toString() || 'null'}|||${stat.typeName || 'null'}`
      )
    )];
    
    const processedStats = uniqueCombinations.map(combination => {
      const [type, capacityStr, typeName] = combination.split('|||');
      const capacity = capacityStr !== 'null' ? parseFloat(capacityStr) : null;
      const actualTypeName = typeName !== 'null' ? typeName : null;

      // Find all stats for this combination
      const statsForCombination = cylinderTypeStats.filter(stat => {
        const statCapacityStr = stat.capacity?.toString() || 'null';
        const statTypeName = stat.typeName || null;
        return (
          stat.cylinderType === type &&
          statCapacityStr === capacityStr &&
          statTypeName === actualTypeName
        );
      });

      const full = statsForCombination.find(stat => stat.currentStatus === 'FULL')?._count.id || 0;
      const empty = statsForCombination.find(stat => stat.currentStatus === 'EMPTY')?._count.id || 0;
      const withCustomer = statsForCombination.find(stat => stat.currentStatus === 'WITH_CUSTOMER')?._count.id || 0;
      const retired = statsForCombination.find(stat => stat.currentStatus === 'RETIRED')?._count.id || 0;
      const maintenance = statsForCombination.find(stat => stat.currentStatus === 'MAINTENANCE')?._count.id || 0;
      
      // Fully dynamic display logic - works for any cylinder type
      // Priority 1: If typeName exists, use it with capacity
      let displayType: string;
      const trimmedTypeName = actualTypeName ? String(actualTypeName).trim() : '';
      
      if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
        // Use typeName with actual capacity from database
        displayType = `${trimmedTypeName} (${capacity !== null ? capacity : 'N/A'}kg)`;
      } else if (capacity !== null) {
        // No typeName but have capacity - use generic format with actual capacity
        displayType = `Cylinder (${capacity}kg)`;
      } else {
        // Fallback to utility function (extracts capacity from enum)
        displayType = getCylinderTypeDisplayName(type);
      }
      
      return {
        type: displayType,
        typeEnum: type, // Keep original enum for reference
        full,
        empty,
        withCustomer,
        retired,
        maintenance,
        // Total only includes cylinders in inventory (excluding WITH_CUSTOMER)
        total: full + empty + retired + maintenance
      };
    });

    // Deduplicate stats by display type to prevent duplicates
    // This can happen if the same combination appears multiple times
    const uniqueStatsMap = new Map<string, typeof processedStats[0]>();
    processedStats.forEach(stat => {
      const key = stat.type; // Use display type as unique key
      if (!uniqueStatsMap.has(key)) {
        uniqueStatsMap.set(key, stat);
      } else {
        // If duplicate exists, merge the counts
        const existing = uniqueStatsMap.get(key)!;
        existing.full += stat.full;
        existing.empty += stat.empty;
        existing.withCustomer += stat.withCustomer;
        existing.retired += stat.retired;
        existing.maintenance += stat.maintenance;
        existing.total = existing.full + existing.empty + existing.retired + existing.maintenance;
      }
    });

    const finalStats = Array.from(uniqueStatsMap.values());

    return NextResponse.json({
      success: true,
      stats: finalStats
    });
  } catch (error) {
    console.error('Error fetching cylinder type stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cylinder type stats' },
      { status: 500 }
    );
  }
}
