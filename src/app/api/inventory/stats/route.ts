import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

export async function GET(request: NextRequest) {
  try {
    // Get total cylinders count (excluding WITH_CUSTOMER - they are tracked separately)
    const totalCylinders = await prisma.cylinder.count({
      where: {
        currentStatus: { not: 'WITH_CUSTOMER' }
      }
    });

    // Get cylinders by type (excluding WITH_CUSTOMER)
    const cylindersByType = await prisma.cylinder.groupBy({
      by: ['cylinderType'],
      where: {
        currentStatus: { not: 'WITH_CUSTOMER' }
      },
      _count: {
        id: true
      }
    });

    // Get cylinders with customers
    const cylindersWithCustomers = await prisma.cylinder.count({
      where: {
        currentStatus: 'WITH_CUSTOMER'
      }
    });

    // Get store inventory count
    const storeInventory = await prisma.cylinder.count({
      where: {
        storeId: {
          not: null
        }
      }
    });

    // Get vehicle inventory count
    const vehicleInventory = await prisma.cylinder.count({
      where: {
        vehicleId: {
          not: null
        }
      }
    });

    // Get accessories total quantity from CustomItem model
    const accessoriesData = await prisma.customItem.findMany({
      where: { isActive: true },
      select: { quantity: true }
    });
    
    const accessoriesCount = accessoriesData.reduce((sum, item) => sum + Number(item.quantity), 0);

    // Get cylinder type stats
    const cylinderTypeStats = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'currentStatus'],
      _count: {
        id: true
      }
    });

    // Process cylinder type stats dynamically (handles any cylinder type)
    const uniqueTypes = [...new Set(cylinderTypeStats.map(stat => stat.cylinderType))];
    
    const processedStats = uniqueTypes.map(type => {
      const typeStats = cylinderTypeStats.filter(stat => stat.cylinderType === type);
      const full = typeStats.find(stat => stat.currentStatus === 'FULL')?._count.id || 0;
      const empty = typeStats.find(stat => stat.currentStatus === 'EMPTY')?._count.id || 0;
      
      // Format type name for display using dynamic utility - works for any cylinder type
      const displayType = getCylinderTypeDisplayName(type);
      
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
