import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const location = searchParams.get('location') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where clause
    // Exclude WITH_CUSTOMER cylinders from main inventory - they are tracked on separate page
    const where: any = {};

    // Build status condition
    let statusCondition: any;
    if (status) {
      // If status filter is selected, use it (but never allow WITH_CUSTOMER)
      if (status === 'WITH_CUSTOMER') {
        // Don't allow filtering by WITH_CUSTOMER on this page - return empty results
        statusCondition = 'INVALID_STATUS_THAT_DOES_NOT_EXIST';
      } else {
        statusCondition = status;
      }
    } else {
      // No status filter - exclude WITH_CUSTOMER cylinders
      statusCondition = { not: 'WITH_CUSTOMER' };
    }

    // Build search condition
    if (search) {
      where.AND = [
        {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } }
          ]
        },
        { currentStatus: statusCondition }
      ];
    } else {
      where.currentStatus = statusCondition;
    }

    if (type) {
      where.cylinderType = type;
    }

    if (location) {
      if (location === 'STORE') {
        where.storeId = { not: null };
      } else if (location === 'VEHICLE') {
        where.vehicleId = { not: null };
      }
      // Note: CUSTOMER location filter is ignored here as WITH_CUSTOMER cylinders are excluded
    }

    // Get cylinders with pagination
    const cylinders = await prisma.cylinder.findMany({
      where,
      include: {
        store: {
          select: {
            name: true
          }
        },
        vehicle: {
          select: {
            vehicleNumber: true,
            driverName: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get total count
    const total = await prisma.cylinder.count({ where });

    // Convert Decimal fields to numbers for JSON serialization
    const serializedCylinders = cylinders.map(cylinder => ({
      ...cylinder,
      capacity: parseFloat(cylinder.capacity.toString()),
      purchasePrice: cylinder.purchasePrice ? parseFloat(cylinder.purchasePrice.toString()) : null
    }));

    return NextResponse.json({
      success: true,
      cylinders: serializedCylinders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cylinders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice } = body;

    // Use provided code or generate one if not provided
    let cylinderCode = code;
    if (!cylinderCode) {
      const count = await prisma.cylinder.count();
      cylinderCode = `CYL-${String(count + 1).padStart(4, '0')}`;
    }

    // Check if code already exists
    const existingCylinder = await prisma.cylinder.findUnique({
      where: { code: cylinderCode }
    });

    if (existingCylinder) {
      return NextResponse.json(
        { success: false, error: 'Cylinder code already exists. Please use a different code.' },
        { status: 400 }
      );
    }

    const cylinder = await prisma.cylinder.create({
      data: {
        code: cylinderCode,
        cylinderType,
        capacity: parseFloat(capacity),
        currentStatus: currentStatus || 'FULL',
        location,
        storeId: storeId || null,
        vehicleId: vehicleId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null
      }
    });

    return NextResponse.json({
      success: true,
      cylinder
    });
  } catch (error) {
    console.error('Error creating cylinder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create cylinder' },
      { status: 500 }
    );
  }
}
