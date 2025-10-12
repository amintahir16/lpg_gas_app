import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice, lastMaintenanceDate, nextMaintenanceDate } = body;

    const cylinder = await prisma.cylinder.update({
      where: {
        id
      },
      data: {
        cylinderType,
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
