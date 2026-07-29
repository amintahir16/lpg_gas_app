import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCylinderTypeDisplayName, normalizeTypeName } from '@/lib/cylinder-utils';
import { buildCylinderVariantKey } from '@/lib/cylinder-variant-key';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    // Include all statuses (including WITH_CUSTOMER) so types that only exist
    // with customers still appear as inventory cards with Full/Empty = 0.
    const cylinderTypeStats = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'currentStatus', 'typeName', 'capacity'],
      where: {
        ...regionScopedWhere(regionId),
      },
      _count: {
        id: true
      }
    });

    // Use shared normalization function from cylinder-utils
    // This ensures consistent case normalization across the entire application

    // Process cylinder type stats dynamically (handles any cylinder type)
    // Note: WITH_CUSTOMER is counted separately; inventory total excludes it
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
      
      const variantKey = buildCylinderVariantKey({
        cylinderType: type,
        typeName: normalizedTypeNameLowercase,
        capacity,
      });

      return {
        type: displayType,
        typeEnum: type, // Keep original enum for reference
        variantKey,
        full,
        empty,
        withCustomer,
        retired,
        maintenance,
        // Total only includes cylinders in inventory (excluding WITH_CUSTOMER)
        total: full + empty + retired + maintenance
      };
    });

    // Deduplicate by variantKey (same typeName+capacity+cylinderType), not display string alone
    const uniqueStatsMap = new Map<string, typeof processedStats[0]>();
    processedStats.forEach(stat => {
      const key = stat.variantKey;
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

    // Fleet + per-type purchase values — all statuses (full, empty, with customers, etc.)
    const [cylindersForValue, activeRegion] = await Promise.all([
      prisma.cylinder.findMany({
        where: regionScopedWhere(regionId),
        select: {
          purchasePrice: true,
          cylinderType: true,
          typeName: true,
          capacity: true,
        },
      }),
      regionId
        ? prisma.region.findUnique({
            where: { id: regionId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    const typeValueMap = new Map<
      string,
      { type: string; typeEnum: string; variantKey: string; purchaseValue: number; count: number }
    >();

    for (const cylinder of cylindersForValue) {
      const capacity = cylinder.capacity != null ? Number(cylinder.capacity) : null;
      const normalizedTypeNameLowercase = cylinder.typeName
        ? cylinder.typeName.toLowerCase().trim()
        : null;
      const normalizedTypeName = normalizeTypeName(normalizedTypeNameLowercase);
      const trimmedTypeName = normalizedTypeName ? String(normalizedTypeName).trim() : '';

      let displayType: string;
      if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
        displayType = `${trimmedTypeName} (${capacity !== null ? capacity : 'N/A'}kg)`;
      } else if (capacity !== null) {
        displayType = `Cylinder (${capacity}kg)`;
      } else {
        displayType = getCylinderTypeDisplayName(cylinder.cylinderType);
      }

      const variantKey = buildCylinderVariantKey({
        cylinderType: cylinder.cylinderType,
        typeName: normalizedTypeNameLowercase,
        capacity,
      });

      const existing = typeValueMap.get(variantKey);
      const price = Number(cylinder.purchasePrice || 0);
      if (existing) {
        existing.purchaseValue += price;
        existing.count += 1;
      } else {
        typeValueMap.set(variantKey, {
          type: displayType,
          typeEnum: cylinder.cylinderType,
          variantKey,
          purchaseValue: price,
          count: 1,
        });
      }
    }

    const typePurchaseValues = Array.from(typeValueMap.values()).sort((a, b) => {
      const aMatch = a.type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
      const bMatch = b.type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);

      if (aMatch && bMatch) {
        const aCapacity = parseFloat(aMatch[2]);
        const bCapacity = parseFloat(bMatch[2]);
        if (aCapacity !== bCapacity) return aCapacity - bCapacity;
        return aMatch[1].trim().toLowerCase().localeCompare(bMatch[1].trim().toLowerCase());
      }
      return a.type.localeCompare(b.type);
    });

    const totalPurchaseValue = typePurchaseValues.reduce((sum, row) => sum + row.purchaseValue, 0);
    const totalCylinderCount = cylindersForValue.length;

    return NextResponse.json({
      success: true,
      stats: finalStats,
      typePurchaseValues,
      totalPurchaseValue,
      totalCylinderCount,
      regionName: activeRegion?.name || null,
    });
  } catch (error) {
    console.error('Error fetching cylinder type stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cylinder type stats' },
      { status: 500 }
    );
  }
}
