import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(request: NextRequest) {
    try {
        const regionId = getActiveRegionId(request);
        const regionScope = regionScopedWhere(regionId);
        // Group cylinders by typeName and capacity to get unique types
        const cylinderTypes = await prisma.cylinder.groupBy({
            by: ['cylinderType', 'typeName', 'capacity'],
            where: {
                currentStatus: {
                    notIn: ['RETIRED']
                },
                ...regionScope,
            },
            _count: {
                id: true
            },
            orderBy: {
                capacity: 'asc'
            }
        });

        // Fetch counts for FULL cylinders specifically
        const fullCounts = await prisma.cylinder.groupBy({
            by: ['cylinderType'],
            where: {
                currentStatus: 'FULL',
                ...regionScope,
            },
            _count: {
                id: true
            }
        });

        // Create a map for quick lookup of full counts
        const fullCountMap = new Map<string, number>();
        fullCounts.forEach(fc => {
            fullCountMap.set(fc.cylinderType, fc._count.id);
        });

        // Transform to friendly format
        const types = cylinderTypes.map(type => {
            const displayType = type.typeName
                ? `${type.typeName} (${parseFloat(type.capacity.toString())}kg)`
                : getCylinderTypeDisplayName(type.cylinderType);

            // Default security prices mapping (fallback can be moved to DB later)
            const securityPrices: Record<string, number> = {
                'CYLINDER_6KG': 2000,
                'DOMESTIC_11_8KG': 3000,
                'STANDARD_15KG': 5000, // Adjusted based on common market values
                'CYLINDER_30KG': 7000,
                'COMMERCIAL_45_4KG': 9000,
            };

            // Determine security price
            let securityPrice = securityPrices[type.cylinderType] || 0;
            if (securityPrice === 0 && type.capacity) {
                securityPrice = Math.round(parseFloat(type.capacity.toString()) * 300);
            }

            return {
                cylinderType: type.cylinderType,
                typeName: type.typeName,
                capacity: parseFloat(type.capacity.toString()),
                label: displayType,
                count: type._count.id, // Total count (all statuses)
                fullCount: fullCountMap.get(type.cylinderType) || 0, // Count of FULL cylinders only
                securityPrice: securityPrice
            };
        });

        return NextResponse.json({
            success: true,
            types
        });
    } catch (error) {
        console.error('Error fetching cylinder types:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch cylinder types' },
            { status: 500 }
        );
    }
}
