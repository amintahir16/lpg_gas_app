import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { houseNumber: { contains: search, mode: 'insensitive' as const } },
        { sector: { contains: search, mode: 'insensitive' as const } },
        { street: { contains: search, mode: 'insensitive' as const } },
        { phase: { contains: search, mode: 'insensitive' as const } },
        { area: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.b2CCustomer.findMany({
        where: whereClause,
        include: {
          cylinderHoldings: {
            select: {
              cylinderType: true,
              quantity: true,
              isReturned: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.b2CCustomer.count({ where: whereClause })
    ]);

    // Calculate summary data
    const [totalCustomers, profitSummary, cylinderSummary] = await Promise.all([
      prisma.b2CCustomer.count(),
      prisma.b2CCustomer.aggregate({
        _sum: { totalProfit: true }
      }),
      prisma.b2CCylinderHolding.aggregate({
        where: { isReturned: false },
        _sum: { quantity: true }
      })
    ]);

    // Get cylinder distribution by type
    const cylinderDistribution = await Promise.all([
      prisma.b2CCylinderHolding.aggregate({
        where: { 
          isReturned: false,
          cylinderType: 'DOMESTIC_11_8KG'
        },
        _sum: { quantity: true }
      }),
      prisma.b2CCylinderHolding.aggregate({
        where: { 
          isReturned: false,
          cylinderType: 'STANDARD_15KG'
        },
        _sum: { quantity: true }
      }),
      prisma.b2CCylinderHolding.aggregate({
        where: { 
          isReturned: false,
          cylinderType: 'COMMERCIAL_45_4KG'
        },
        _sum: { quantity: true }
      })
    ]);

    const summary = {
      totalCustomers,
      totalProfit: Number(profitSummary._sum.totalProfit || 0),
      cylindersInMarket: {
        domestic: Number(cylinderDistribution[0]._sum.quantity || 0),
        standard: Number(cylinderDistribution[1]._sum.quantity || 0),
        commercial: Number(cylinderDistribution[2]._sum.quantity || 0)
      }
    };

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };

    return NextResponse.json({
      customers,
      pagination,
      summary
    });

  } catch (error) {
    console.error('Error fetching B2C customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch B2C customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      email,
      address,
      houseNumber,
      sector,
      street,
      phase,
      area,
      city = 'Hayatabad',
      googleMapLocation
    } = body;

    // Validate required fields
    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: 'Name, phone, and address are required' },
        { status: 400 }
      );
    }

    // Check if customer with same phone already exists
    const existingCustomer = await prisma.b2CCustomer.findFirst({
      where: { phone }
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 400 }
      );
    }

    const customer = await prisma.b2CCustomer.create({
      data: {
        name,
        phone,
        email: email || null,
        address,
        houseNumber: houseNumber || null,
        sector: sector || null,
        street: street || null,
        phase: phase || null,
        area: area || null,
        city,
        googleMapLocation: googleMapLocation || null,
        totalProfit: 0
      }
    });

    return NextResponse.json(customer, { status: 201 });

  } catch (error) {
    console.error('Error creating B2C customer:', error);
    return NextResponse.json(
      { error: 'Failed to create B2C customer' },
      { status: 500 }
    );
  }
}
