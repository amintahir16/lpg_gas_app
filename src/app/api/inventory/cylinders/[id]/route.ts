import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CylinderType } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { typeName, cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice, lastMaintenanceDate, nextMaintenanceDate } = body;

    // Handle custom cylinder types that may not be in the enum
    let finalCylinderType = cylinderType;
    const validEnumTypes = ['CYLINDER_6KG', 'DOMESTIC_11_8KG', 'STANDARD_15KG', 'CYLINDER_30KG', 'COMMERCIAL_45_4KG'];
    
    // Check if the cylinder type is a valid enum value
    if (!validEnumTypes.includes(cylinderType)) {
      // Custom type - use STANDARD_15KG as fallback enum value
      finalCylinderType = 'STANDARD_15KG';
      console.log(`Custom cylinder type "${cylinderType}" mapped to STANDARD_15KG enum. Actual capacity: ${capacity}kg`);
    }

    const cylinder = await prisma.cylinder.update({
      where: {
        id
      },
      data: {
        typeName: typeName || null, // Store original type name for display
        cylinderType: finalCylinderType as CylinderType,
        capacity: parseFloat(capacity),
        currentStatus,
        location,
        storeId: storeId || null,
        vehicleId: vehicleId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null
      }
    });

    return NextResponse.json({
      success: true,
      cylinder
    });
  } catch (error) {
    console.error('Error updating cylinder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cylinder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if cylinder exists and is empty
    const cylinder = await prisma.cylinder.findUnique({
      where: { id }
    });

    if (!cylinder) {
      return NextResponse.json(
        { success: false, error: 'Cylinder not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of empty cylinders
    if (cylinder.currentStatus !== 'EMPTY') {
      return NextResponse.json(
        { success: false, error: 'Only empty cylinders can be deleted' },
        { status: 400 }
      );
    }

    await prisma.cylinder.delete({
      where: {
        id
      }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting cylinder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete cylinder' },
      { status: 500 }
    );
  }
}
