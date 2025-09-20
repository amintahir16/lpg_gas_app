import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const stores = await prisma.store.findMany({
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

    // Process stores to include cylinder count
    const processedStores = stores.map(store => ({
      ...store,
      cylinderCount: store._count.cylinders,
      cylinders: store.cylinders.slice(0, 10) // Limit to first 10 for display
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
    const body = await request.json();
    const { name, location, address } = body;

    const store = await prisma.store.create({
      data: {
        name,
        location,
        address: address || null
      }
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
