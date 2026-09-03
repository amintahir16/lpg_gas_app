import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { clampLimit } from '@/lib/apiAuth';

// GET /api/admin/plant-prices - Get plant prices for active region (with optional date filter)
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

      // Backward-compatibility fallback for legacy un-scoped rows (pre-region migration)
      if (!price && regionId) {
        price = await prisma.dailyPlantPrice.findFirst({
          where: { date: today, regionId: null }
        });
        if (!price) {
          price = await prisma.dailyPlantPrice.findFirst({
            where: { regionId: null },
            orderBy: { date: 'desc' }
          });
        }
      }

      return NextResponse.json({
        current: price,
        isToday: price ? price.date.toDateString() === today.toDateString() : false
      });
    }

    if (dateParam) {
      const date = new Date(dateParam);
      date.setHours(0, 0, 0, 0);

      let price = await prisma.dailyPlantPrice.findFirst({
        where: { date, ...regionScope }
      });

      if (!price && regionId) {
        price = await prisma.dailyPlantPrice.findFirst({
          where: { date, regionId: null }
        });
      }

      if (!price) {
        return NextResponse.json(
          { error: 'Not Found', message: 'No plant price found for this date' },
          { status: 404 }
        );
      }

      return NextResponse.json(price);
    }

    let prices = await prisma.dailyPlantPrice.findMany({
      where: regionScope,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        createdByUser: {
          select: { name: true, email: true }
        }
      }
    });

    if (prices.length === 0 && regionId) {
      // Fallback for legacy un-scoped rows if region has no entries yet
      prices = await prisma.dailyPlantPrice.findMany({
        where: { regionId: null },
        orderBy: { date: 'desc' },
        take: limit,
        include: {
          createdByUser: {
            select: { name: true, email: true }
          }
        }
      });
    }

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching plant prices:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch plant prices' },
      { status: 500 }
    );
  }
}

// POST /api/admin/plant-prices - Set/update today's plant price for the active region
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

    // Strictly region-scoped: Only update or create for the active branch (regionId).
    // Never propagate or overwrite other branches.
    const existingPrice = await prisma.dailyPlantPrice.findFirst({
      where: { date: targetDate, ...regionScopedWhere(regionId) }
    });

    let price;
    if (existingPrice) {
      price = await prisma.dailyPlantPrice.update({
        where: { id: existingPrice.id },
        data: {
          plantPrice118kg: parseFloat(plantPrice118kg),
          notes: notes || null,
          updatedAt: new Date(),
        }
      });
    } else {
      price = await prisma.dailyPlantPrice.create({
        data: {
          date: targetDate,
          plantPrice118kg: parseFloat(plantPrice118kg),
          notes: notes || null,
          createdBy: session.user.id,
          regionId: regionId || null,
        }
      });
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

