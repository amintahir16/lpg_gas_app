import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma, CylinderStatus, CylinderType } from '@prisma/client';
import { createCylinderAddedNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Prisma.CylinderWhereInput = {
      OR: search ? [
        { code: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { location: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      ] : undefined,
      currentStatus: status ? (status as CylinderStatus) : undefined,
      cylinderType: type ? (type as CylinderType) : undefined
    };

    const [cylinders, total] = await Promise.all([
      prisma.cylinder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cylinderRentals: {
            where: { status: 'ACTIVE' },
            include: {
              customer: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }),
      prisma.cylinder.count({ where })
    ]);

    return NextResponse.json({
      cylinders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Cylinders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cylinders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      cylinderType,
      capacity,
      location,
      purchaseDate,
      purchasePrice,
      lastMaintenanceDate,
      nextMaintenanceDate
    } = body;

    // Generate unique cylinder code
    const cylinderCount = await prisma.cylinder.count();
    const code = `CYL${String(cylinderCount + 1).padStart(3, '0')}`;

    const cylinder = await prisma.cylinder.create({
      data: {
        code,
        cylinderType: cylinderType as CylinderType,
        capacity: parseFloat(capacity),
        location,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null,
        currentStatus: 'AVAILABLE'
      },
      include: {
        cylinderRentals: {
          where: { status: 'ACTIVE' },
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Create notification for new cylinder
    try {
      await createCylinderAddedNotification(code, session.user.email || 'Unknown User');
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    return NextResponse.json(cylinder, { status: 201 });
  } catch (error) {
    console.error('Cylinder creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create cylinder' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      cylinderType,
      capacity,
      location,
      currentStatus,
      purchaseDate,
      purchasePrice,
      lastMaintenanceDate,
      nextMaintenanceDate
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Cylinder ID is required' }, { status: 400 });
    }

    // Check if cylinder exists
    const existingCylinder = await prisma.cylinder.findUnique({
      where: { id }
    });

    if (!existingCylinder) {
      return NextResponse.json({ error: 'Cylinder not found' }, { status: 404 });
    }

    const cylinder = await prisma.cylinder.update({
      where: { id },
      data: {
        cylinderType: cylinderType as CylinderType,
        capacity: parseFloat(capacity),
        location,
        currentStatus: currentStatus as CylinderStatus,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null,
      },
      include: {
        cylinderRentals: {
          where: { status: 'ACTIVE' },
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(cylinder);
  } catch (error) {
    console.error('Cylinder update error:', error);
    return NextResponse.json(
      { error: 'Failed to update cylinder' },
      { status: 500 }
    );
  }
}