import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';
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
    const uniqueTypes = [...new Set(cylinderTypeStats.map(stat => stat.cylinderType))];

    const processedStats = uniqueTypes.map(type => {
      // Find all stats for this exact cylinderType
      const typeStats = cylinderTypeStats.filter(stat => stat.cylinderType === type);

      // Calculate full and empty counts by aggregating across potentially different typeNames/capacities
      const full = typeStats
        .filter(stat => stat.currentStatus === 'FULL')
        .reduce((sum, stat) => sum + stat._count.id, 0);

      const empty = typeStats
        .filter(stat => stat.currentStatus === 'EMPTY')
        .reduce((sum, stat) => sum + stat._count.id, 0);

      // Try to find the typeName and capacity for this cylinder type
      // We take the first one found for this cylinderType, since the enum/type string usually correlates 1:1
      const representativeStat = typeStats.find(stat => stat.typeName || stat.capacity);
      const typeName = representativeStat?.typeName || null;
      const capacity = representativeStat?.capacity ? Number(representativeStat.capacity) : null;

      // Format type name for display using dynamic utility - passes typeName and capacity now
      const displayType = getCylinderTypeDisplayName(type, typeName, capacity);

      return {
        type: displayType,
        typeEnum: type, // Keep original enum for reference
        full,
        empty,
        total: full + empty
      };
    });

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
      cylinderTypeStats: processedStats
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory stats' },
      { status: 500 }
    );
  }
}
