import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTypeName } from '@/lib/cylinder-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { typeName, cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice, lastMaintenanceDate, nextMaintenanceDate } = body;

    // IMPORTANT: Normalize typeName to consistent case format before storing
    // This ensures "special", "Special", "SPECIAL" all become "Special"
    // This prevents duplicate cards in inventory dashboard
    const normalizedTypeName = normalizeTypeName(typeName) || null;

    // Store the cylinder type directly as a string (no enum validation needed)
    const cylinder = await prisma.cylinder.update({
      where: {
        id
      },
      data: {
        typeName: normalizedTypeName, // Store normalized type name for consistent grouping
        cylinderType: cylinderType, // Store as string directly
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
