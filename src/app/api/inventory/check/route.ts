import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkCylinderInventory, checkAccessoryInventory } from '@/lib/simple-inventory-check';
import { getActiveRegionId } from '@/lib/region';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const regionId = getActiveRegionId(request);

    const body = await request.json();
    const { cylinders, accessories } = body;

    const results: any[] = [];

    if (cylinders && cylinders.length > 0) {
      for (const cylinder of cylinders) {
        const result = await checkCylinderInventory(cylinder.cylinderType, cylinder.requested, regionId);
        results.push(result);
      }
    }

    if (accessories && accessories.length > 0) {
      for (const accessory of accessories) {
        const result = await checkAccessoryInventory(
          accessory.itemName,
          accessory.itemType,
          accessory.quality || '',
          accessory.requested,
          regionId,
        );
        results.push(result);
      }
    }

    // Check if any validation failed
    const hasErrors = results.some(result => !result.isValid);

    return NextResponse.json({
      results,
      hasErrors,
      isValid: !hasErrors
    });

  } catch (error) {
    console.error('Error checking inventory:', error);
    return NextResponse.json(
      { error: 'Failed to check inventory' },
      { status: 500 }
    );
  }
}
