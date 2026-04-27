import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveRegionId, regionScopedWhere, withRegionScope } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const stores = await prisma.store.findMany({
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
        name: 'asc'
      }
    });

    const processedStores = stores.map(store => ({
      ...store,
      cylinderCount: store._count.cylinders,
      cylinders: store.cylinders.slice(0, 10)
    }));

    return NextResponse.json({
      success: true,
      stores: processedStores
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const { name, location, address } = body;

    const store = await prisma.store.create({
      data: withRegionScope({
        name,
        location,
        address: address || null
      }, regionId)
    });

    return NextResponse.json({
      success: true,
      store
    });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create store' },
      { status: 500 }
    );
  }
}
