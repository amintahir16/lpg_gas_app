import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const latest = searchParams.get('latest') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 30;

    if (latest) {
      // Get today's price or the most recent one
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let price = await prisma.dailyPlantPrice.findUnique({
        where: { date: today }
      });

      if (!price) {
        // Get the most recent price
        price = await prisma.dailyPlantPrice.findFirst({
          orderBy: { date: 'desc' }
        });
      }

      return NextResponse.json({
        current: price,
        isToday: price?.date.toDateString() === today.toDateString()
      });
    }

    if (dateParam) {
      // Get price for specific date
      const date = new Date(dateParam);
      date.setHours(0, 0, 0, 0);

      const price = await prisma.dailyPlantPrice.findUnique({
        where: { date }
      });

      if (!price) {
        return NextResponse.json(
          { error: 'Not Found', message: 'No plant price found for this date' },
          { status: 404 }
        );
      }

      return NextResponse.json(price);
    }

    // Get recent prices (history)
    const prices = await prisma.dailyPlantPrice.findMany({
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

    // Check if price already exists for this date
    const existingPrice = await prisma.dailyPlantPrice.findUnique({
      where: { date: targetDate }
    });

    let price;
    if (existingPrice) {
      // Update existing price
      price = await prisma.dailyPlantPrice.update({
        where: { id: existingPrice.id },
        data: {
          plantPrice118kg: parseFloat(plantPrice118kg),
          notes: notes || null
        },
        include: {
          createdByUser: {
            select: { name: true, email: true }
          }
        }
      });
    } else {
      // Create new price
      price = await prisma.dailyPlantPrice.create({
        data: {
          date: targetDate,
          plantPrice118kg: parseFloat(plantPrice118kg),
          notes: notes || null,
          createdBy: session.user.id
        },
        include: {
          createdByUser: {
            select: { name: true, email: true }
          }
        }
      });
    }

    return NextResponse.json(price, { status: existingPrice ? 200 : 201 });
  } catch (error) {
    console.error('Error setting plant price:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to set plant price' },
      { status: 500 }
    );
  }
}
