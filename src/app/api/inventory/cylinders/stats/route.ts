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
      
      // Use the same display logic as the frontend
      // Priority 1: If typeName exists, use it with capacity
      let displayType: string;
      const trimmedTypeName = actualTypeName ? String(actualTypeName).trim() : '';
      if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
        displayType = `${trimmedTypeName} (${capacity !== null ? capacity : 'N/A'}kg)`;
      } else if (type === 'DOMESTIC_11_8KG') {
        displayType = `Domestic (${capacity !== null ? capacity : 11.8}kg)`;
      } else if (type === 'STANDARD_15KG') {
        // If capacity doesn't match 15kg, it's a custom type
        if (capacity !== null && Math.abs(capacity - 15.0) > 0.1) {
          displayType = `Cylinder (${capacity}kg)`;
        } else {
          displayType = `Standard (${capacity !== null ? capacity : 15}kg)`;
        }
      } else if (type === 'COMMERCIAL_45_4KG') {
        displayType = `Commercial (${capacity !== null ? capacity : 45.4}kg)`;
      } else if (type === 'CYLINDER_6KG') {
        displayType = `Cylinder (${capacity !== null ? capacity : 6}kg)`;
      } else if (type === 'CYLINDER_30KG') {
        displayType = `Cylinder (${capacity !== null ? capacity : 30}kg)`;
      } else {
        // Fallback to utility function
        displayType = getCylinderTypeDisplayName(type);
        if (capacity !== null) {
          // Override with actual capacity if available
          const weightMatch = displayType.match(/(\d+\.?\d*)kg/);
          if (!weightMatch || weightMatch[1] !== capacity.toString()) {
            displayType = `Cylinder (${capacity}kg)`;
          }
        }
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
