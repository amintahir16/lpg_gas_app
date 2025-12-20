import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCylinderTypeDisplayName, normalizeTypeName } from '@/lib/cylinder-utils';

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

    // Use shared normalization function from cylinder-utils
    // This ensures consistent case normalization across the entire application

    // Process cylinder type stats dynamically (handles any cylinder type)
    // Note: Exclude WITH_CUSTOMER from inventory totals as they are tracked separately
    // Create unique combinations of typeName + capacity + cylinderType
    // IMPORTANT: Normalize typeName to lowercase for case-insensitive grouping
    // This ensures "special" and "Special" are treated as the same type
    // Use a delimiter that won't conflict with data (|||)
    const uniqueCombinations = [...new Set(
      cylinderTypeStats.map(stat => {
        // Normalize typeName to lowercase for grouping (case-insensitive)
        const normalizedTypeName = stat.typeName 
          ? stat.typeName.toLowerCase().trim() 
          : 'null';
        return `${stat.cylinderType}|||${stat.capacity?.toString() || 'null'}|||${normalizedTypeName}`;
      })
    )];
    
    const processedStats = uniqueCombinations.map(combination => {
      const [type, capacityStr, normalizedTypeNameLower] = combination.split('|||');
      const capacity = capacityStr !== 'null' ? parseFloat(capacityStr) : null;
      const normalizedTypeNameLowercase = normalizedTypeNameLower !== 'null' ? normalizedTypeNameLower : null;

      // Find all stats for this combination using case-insensitive typeName comparison
      // This groups "special", "Special", "SPECIAL" together
      const statsForCombination = cylinderTypeStats.filter(stat => {
        const statCapacityStr = stat.capacity?.toString() || 'null';
        const statTypeNameLower = stat.typeName 
          ? stat.typeName.toLowerCase().trim() 
          : 'null';
        return (
          stat.cylinderType === type &&
          statCapacityStr === capacityStr &&
          statTypeNameLower === normalizedTypeNameLowercase
        );
      });

      const full = statsForCombination.find(stat => stat.currentStatus === 'FULL')?._count.id || 0;
      const empty = statsForCombination.find(stat => stat.currentStatus === 'EMPTY')?._count.id || 0;
      const withCustomer = statsForCombination.find(stat => stat.currentStatus === 'WITH_CUSTOMER')?._count.id || 0;
      const retired = statsForCombination.find(stat => stat.currentStatus === 'RETIRED')?._count.id || 0;
      const maintenance = statsForCombination.find(stat => stat.currentStatus === 'MAINTENANCE')?._count.id || 0;
      
      // Fully dynamic display logic - works for any cylinder type
      // Priority 1: If typeName exists, use it with capacity
      // Normalize typeName to proper case format for display (capitalize first letter of each word)
      let displayType: string;
      const normalizedTypeName = normalizeTypeName(normalizedTypeNameLowercase);
      const trimmedTypeName = normalizedTypeName ? String(normalizedTypeName).trim() : '';
      
      if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
        // Use normalized typeName with actual capacity from database
        // This ensures consistent display format (e.g., "Special" not "special" or "SPECIAL")
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

    // Sort stats to maintain consistent card positions
    // Sort by: 1) capacity (ascending), 2) typeName (alphabetically)
    // This ensures cards stay in the same position when updates occur
    finalStats.sort((a, b) => {
      // Extract typeName and capacity from display type for sorting
      const aMatch = a.type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
      const bMatch = b.type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
      
      if (aMatch && bMatch) {
        const aTypeName = aMatch[1].trim().toLowerCase();
        const bTypeName = bMatch[1].trim().toLowerCase();
        const aCapacity = parseFloat(aMatch[2]);
        const bCapacity = parseFloat(bMatch[2]);
        
        // First sort by capacity (ascending)
        if (aCapacity !== bCapacity) {
          return aCapacity - bCapacity;
        }
        
        // If capacity is the same, sort by typeName alphabetically
        return aTypeName.localeCompare(bTypeName);
      }
      
      // Fallback: sort by display type string
      return a.type.localeCompare(b.type);
    });

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
