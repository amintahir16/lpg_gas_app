import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCylinderTypeDisplayName, normalizeTypeName } from '@/lib/cylinder-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;

    // Get customer to find their name for location matching
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get cylinders with this customer grouped by cylinderType, typeName, and capacity
    // This matches the same grouping logic as the inventory stats API
    const cylinderDues = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'typeName', 'capacity'],
      where: {
        currentStatus: 'WITH_CUSTOMER',
        location: {
          contains: customer.name
        }
      },
      _count: {
        id: true
      }
    });

    // Process cylinder dues with proper display names (same logic as inventory stats)
    const uniqueCombinations = [...new Set(
      cylinderDues.map(stat => {
        const normalizedTypeName = stat.typeName 
          ? stat.typeName.toLowerCase().trim() 
          : 'null';
        return `${stat.cylinderType}|||${stat.capacity?.toString() || 'null'}|||${normalizedTypeName}`;
      })
    )];

    const processedDues = uniqueCombinations.map(combination => {
      const [type, capacityStr, normalizedTypeNameLower] = combination.split('|||');
      const capacity = capacityStr !== 'null' ? parseFloat(capacityStr) : null;
      const normalizedTypeNameLowercase = normalizedTypeNameLower !== 'null' ? normalizedTypeNameLower : null;

      // Find all dues for this combination
      const duesForCombination = cylinderDues.filter(stat => {
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

      const totalCount = duesForCombination.reduce((sum, stat) => sum + stat._count.id, 0);

      // Use same display logic as inventory stats API
      let displayType: string;
      const normalizedTypeName = normalizeTypeName(normalizedTypeNameLowercase);
      const trimmedTypeName = normalizedTypeName ? String(normalizedTypeName).trim() : '';
      
      if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
        // Use normalized typeName with actual capacity from database
        displayType = `${trimmedTypeName} (${capacity !== null ? capacity : 'N/A'}kg)`;
      } else if (capacity !== null) {
        // No typeName but have capacity - use generic format with actual capacity
        displayType = `Cylinder (${capacity}kg)`;
      } else {
        // Fallback to utility function (extracts capacity from enum)
        displayType = getCylinderTypeDisplayName(type);
      }

      return {
        cylinderType: type,
        displayName: displayType,
        count: totalCount
      };
    });

    // Deduplicate by display name and merge counts
    const uniqueDuesMap = new Map<string, typeof processedDues[0]>();
    processedDues.forEach(due => {
      const key = due.displayName;
      if (!uniqueDuesMap.has(key)) {
        uniqueDuesMap.set(key, due);
      } else {
        // Merge counts if duplicate exists
        const existing = uniqueDuesMap.get(key)!;
        existing.count += due.count;
      }
    });

    const dues = Array.from(uniqueDuesMap.values());

    // Sort by display name for consistent ordering
    dues.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({
      success: true,
      cylinderDues: dues
    });
  } catch (error) {
    console.error('Error fetching cylinder dues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cylinder dues' },
      { status: 500 }
    );
  }
}

