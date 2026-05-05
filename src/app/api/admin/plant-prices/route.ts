import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { clampLimit } from '@/lib/apiAuth';

// GET /api/admin/plant-prices - Get plant prices (with optional date filter)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const latest = searchParams.get('latest') === 'true';
    const limit = clampLimit(searchParams.get('limit'), 30);

    if (latest) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let price = await prisma.dailyPlantPrice.findFirst({
        where: { date: today, ...regionScope }
      });

      if (!price) {
        price = await prisma.dailyPlantPrice.findFirst({
          where: regionScope,
          orderBy: { date: 'desc' }
        });
      }

      return NextResponse.json({
        current: price,
        isToday: price?.date.toDateString() === today.toDateString()
      });
    }

    if (dateParam) {
      const date = new Date(dateParam);
      date.setHours(0, 0, 0, 0);

      const price = await prisma.dailyPlantPrice.findFirst({
        where: { date, ...regionScope }
      });

      if (!price) {
        return NextResponse.json(
          { error: 'Not Found', message: 'No plant price found for this date' },
          { status: 404 }
        );
      }

      return NextResponse.json(price);
    }

    const prices = await prisma.dailyPlantPrice.findMany({
      where: regionScope,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        createdByUser: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching plant prices:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch plant prices' },
      { status: 500 }
    );
  }
}

// POST /api/admin/plant-prices - Set/update today's plant price
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const regionId = getActiveRegionId(request);

    const body = await request.json();
    const { plantPrice118kg, notes, date } = body;

    if (!plantPrice118kg || plantPrice118kg <= 0) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Valid plant price is required' },
        { status: 400 }
      );
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Identify if propagation is needed (SUPER_ADMIN in Default Region)
    let shouldPropagate = false;
    if (session.user.role === 'SUPER_ADMIN' && regionId) {
      const currentRegion = await prisma.region.findUnique({
        where: { id: regionId },
        select: { isDefault: true }
      });
      if (currentRegion?.isDefault) {
        shouldPropagate = true;
      }
    }

    let price;
    if (shouldPropagate) {
      // Propagate to ALL active regions
      const allActiveRegions = await prisma.region.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      const upsertOps = allActiveRegions.map((r) => {
        return prisma.dailyPlantPrice.upsert({
          where: {
            regionId_date: {
              regionId: r.id,
              date: targetDate
            }
          },
          update: {
            plantPrice118kg: parseFloat(plantPrice118kg),
            notes: notes || null
          },
          create: {
            regionId: r.id,
            date: targetDate,
            plantPrice118kg: parseFloat(plantPrice118kg),
            notes: notes || null,
            createdBy: session.user.id
          }
        });
      });

      const results = await prisma.$transaction(upsertOps);
      // Return the result for the current region (or first one)
      price = results.find(p => p.regionId === regionId) || results[0];
      
      console.log(`[PlantPrice] Propagated price to ${results.length} active regions`);
    } else {
      // Standard local-only update
      const existingPrice = await prisma.dailyPlantPrice.findFirst({
        where: { date: targetDate, ...regionScopedWhere(regionId) }
      });

      if (existingPrice) {
        price = await prisma.dailyPlantPrice.update({
          where: { id: existingPrice.id },
          data: {
            plantPrice118kg: parseFloat(plantPrice118kg),
            notes: notes || null
          }
        });
      } else {
        price = await prisma.dailyPlantPrice.create({
          data: {
            date: targetDate,
            plantPrice118kg: parseFloat(plantPrice118kg),
            notes: notes || null,
            createdBy: session.user.id,
            ...(regionId ? { regionId } : {}),
          }
        });
      }
    }

    // Refresh createdByUser info for the response
    const finalPrice = await prisma.dailyPlantPrice.findUnique({
      where: { id: price.id },
      include: {
        createdByUser: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(finalPrice, { status: 200 });
  } catch (error) {
    console.error('Error setting plant price:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to set plant price' },
      { status: 500 }
    );
  }
}
