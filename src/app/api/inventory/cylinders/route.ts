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
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.currentStatus = status;
    }

    if (type) {
      where.cylinderType = type;
    }

    if (location) {
      if (location === 'STORE') {
        where.storeId = { not: null };
      } else if (location === 'VEHICLE') {
        where.vehicleId = { not: null };
      } else if (location === 'CUSTOMER') {
        where.currentStatus = 'WITH_CUSTOMER';
      }
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

    return NextResponse.json({
      success: true,
      cylinders,
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
    const { cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice } = body;

    // Generate cylinder code
    const count = await prisma.cylinder.count();
    const code = `CYL-${String(count + 1).padStart(4, '0')}`;

    const cylinder = await prisma.cylinder.create({
      data: {
        code,
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
