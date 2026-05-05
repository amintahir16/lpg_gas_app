import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { buildCylinderVariantKey } from '@/lib/cylinder-variant-key';

export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    // Get empty cylinders grouped by type
    const emptyCylinders = await prisma.cylinder.findMany({
      where: {
        currentStatus: 'EMPTY',
        ...regionScopedWhere(regionId),
      },
      select: {
        id: true,
        code: true,
        cylinderType: true,
        typeName: true,
        capacity: true,
      },
      orderBy: {
        code: 'asc'
      }
    });

    // Group by cylinder variant key (type + capacity + typeName), not just enum.
    const groupedCylinders: Record<string, Array<(typeof emptyCylinders)[number] & { variantKey: string }>> = {};
    
    emptyCylinders.forEach(cylinder => {
      const variantKey = buildCylinderVariantKey({
        cylinderType: cylinder.cylinderType,
        typeName: cylinder.typeName,
        capacity: cylinder.capacity,
      });
      if (!groupedCylinders[variantKey]) {
        groupedCylinders[variantKey] = [];
      }
      groupedCylinders[variantKey].push({ ...cylinder, variantKey });
    });

    return NextResponse.json({
      success: true,
      cylinders: groupedCylinders
    });
  } catch (error) {
    console.error('Error fetching empty cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch empty cylinders' },
      { status: 500 }
    );
  }
}
