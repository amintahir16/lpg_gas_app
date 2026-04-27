import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveRegionId, regionScopedWhere, withRegionScope } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const vehicles = await prisma.vehicle.findMany({
      where: { ...regionScopedWhere(regionId) },
      include: {
        cylinders: {
          select: {
            id: true,
            code: true,
            cylinderType: true,
            currentStatus: true
          }
        },
        _count: {
          select: {
            cylinders: true
          }
        }
      },
      orderBy: {
        vehicleNumber: 'asc'
      }
    });

    const processedVehicles = vehicles.map(vehicle => ({
      ...vehicle,
      cylinderCount: vehicle._count.cylinders,
      cylinders: vehicle.cylinders.slice(0, 10)
    }));

    return NextResponse.json({
      success: true,
      vehicles: processedVehicles
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const { vehicleNumber, vehicleType, driverName, capacity } = body;

    const vehicle = await prisma.vehicle.create({
      data: withRegionScope({
        vehicleNumber,
        vehicleType,
        driverName: driverName || null,
        capacity: capacity ? parseInt(capacity) : null
      }, regionId)
    });

    return NextResponse.json({
      success: true,
      vehicle
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}
