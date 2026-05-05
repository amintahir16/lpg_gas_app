import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCylinderTypeDisplayName, normalizeTypeName } from '@/lib/cylinder-utils';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);

    const totalCylinders = await prisma.cylinder.count({
      where: {
        currentStatus: { not: 'WITH_CUSTOMER' },
        ...regionScope,
      }
    });

    const cylindersByType = await prisma.cylinder.groupBy({
      by: ['cylinderType'],
      where: {
        currentStatus: { not: 'WITH_CUSTOMER' },
        ...regionScope,
      },
      _count: {
        id: true
      }
    });

    const cylindersWithCustomers = await prisma.cylinder.count({
      where: {
        currentStatus: 'WITH_CUSTOMER',
        ...regionScope,
      }
    });

    const storeInventory = await prisma.cylinder.count({
      where: {
        storeId: {
          not: null
        },
        ...regionScope,
      }
    });

    const vehicleInventory = await prisma.cylinder.count({
      where: {
        vehicleId: {
          not: null
        },
        ...regionScope,
      }
    });

    const accessoriesData = await prisma.customItem.findMany({
      where: { isActive: true, ...regionScope },
      select: { quantity: true }
    });

    const accessoriesCount = accessoriesData.reduce((sum, item) => sum + Number(item.quantity), 0);

    const cylinderTypeStats = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'typeName', 'capacity', 'currentStatus'],
      where: regionScope,
      _count: {
        id: true
      }
    });

    // Process cylinder type stats dynamically (handles any cylinder type)
    // Group by typeName + capacity + cylinderType for accurate separation of custom types
    // Use case-insensitive typeName comparison to merge "special" and "Special"
    const uniqueCombinations = [...new Set(
      cylinderTypeStats.map(stat => {
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

      const full = statsForCombination
        .filter(stat => stat.currentStatus === 'FULL')
        .reduce((sum, stat) => sum + stat._count.id, 0);

      const empty = statsForCombination
        .filter(stat => stat.currentStatus === 'EMPTY')
        .reduce((sum, stat) => sum + stat._count.id, 0);

      // Normalize typeName to proper case format for display
      let displayType: string;
      const normalizedTypeName = normalizeTypeName(normalizedTypeNameLowercase);
      const trimmedTypeName = normalizedTypeName ? String(normalizedTypeName).trim() : '';

      if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
        displayType = `${trimmedTypeName} (${capacity !== null ? capacity : 'N/A'}kg)`;
      } else if (capacity !== null) {
        displayType = `Cylinder (${capacity}kg)`;
      } else {
        displayType = getCylinderTypeDisplayName(type);
      }

      return {
        type: displayType,
        typeEnum: type, // Keep original enum for reference
        full,
        empty,
        total: full + empty
      };
    });

    // Deduplicate stats by display type
    const uniqueStatsMap = new Map<string, typeof processedStats[0]>();
    processedStats.forEach(stat => {
      const key = stat.type;
      if (!uniqueStatsMap.has(key)) {
        uniqueStatsMap.set(key, stat);
      } else {
        const existing = uniqueStatsMap.get(key)!;
        existing.full += stat.full;
        existing.empty += stat.empty;
        existing.total = existing.full + existing.empty;
      }
    });

    const finalCylinderTypeStats = Array.from(uniqueStatsMap.values());

    const stats = {
      totalCylinders,
      cylindersByType: {
        domestic: cylindersByType.find(c => c.cylinderType === 'DOMESTIC_11_8KG')?._count.id || 0,
        standard: cylindersByType.find(c => c.cylinderType === 'STANDARD_15KG')?._count.id || 0,
        commercial: cylindersByType.find(c => c.cylinderType === 'COMMERCIAL_45_4KG')?._count.id || 0
      },
      cylindersWithCustomers,
      storeInventory,
      vehicleInventory,
      accessoriesCount
    };

    return NextResponse.json({
      success: true,
      stats,
      cylinderTypeStats: finalCylinderTypeStats
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory stats' },
      { status: 500 }
    );
  }
}
