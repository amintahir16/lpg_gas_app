import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere, withRegionScope } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filterStatus = searchParams.get('status') || 'ALL'; // 'ACTIVE' | 'INACTIVE' | 'ALL'
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // 'PROFIT' | 'NAME' | 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause: any = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { houseNumber: { contains: search, mode: 'insensitive' as const } },
        { sector: { contains: search, mode: 'insensitive' as const } },
        { street: { contains: search, mode: 'insensitive' as const } },
        { phase: { contains: search, mode: 'insensitive' as const } },
        { area: { contains: search, mode: 'insensitive' as const } }
      ],
      ...regionScopedWhere(regionId),
    } : { ...regionScopedWhere(regionId) };

    if (filterStatus === 'ACTIVE') {
      whereClause.isActive = true;
    } else if (filterStatus === 'INACTIVE') {
      whereClause.isActive = false;
    }

    let orderByClause: any = { createdAt: 'desc' };
    if (sortBy === 'PROFIT') {
      orderByClause = { totalProfit: sortOrder };
    } else if (sortBy === 'NAME') {
      orderByClause = { name: sortOrder };
    } else {
      orderByClause = { createdAt: sortOrder };
    }

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
        orderBy: orderByClause,
        skip,
        take: limit
      }),
      prisma.b2CCustomer.count({ where: whereClause })
    ]);

    // Calculate summary data
    const [totalCustomers, profitSummary, cylinderSummary] = await Promise.all([
      prisma.b2CCustomer.count({ where: whereClause }), // Total Customers should respect filters
      prisma.b2CCustomer.aggregate({
        where: whereClause, // Profit should respect filters
        _sum: { totalProfit: true }
      }),
      prisma.b2CCylinderHolding.aggregate({
        where: {
          isReturned: false,
          customer: whereClause // Only include holdings for filtered customers
        },
        _sum: { quantity: true, securityAmount: true }
      })
    ]);

    // Get cylinder distribution by type
    // Get cylinder distribution by type dynamically
    const cylinderHoldings = await prisma.b2CCylinderHolding.groupBy({
      by: ['cylinderType'],
      where: {
        isReturned: false,
        customer: whereClause // Only include holdings for filtered customers
      },
      _sum: { quantity: true }
    });

    const cylinderBreakdown: Record<string, number> = {};
    cylinderHoldings.forEach(holding => {
      cylinderBreakdown[holding.cylinderType] = holding._sum.quantity || 0;
    });

    // Get all unique types sorted alphabetically
    const cylinderTypes = Object.keys(cylinderBreakdown).sort();

    // Fetch details for these types from the Cylinder table to get proper display names
    // This is how B2B dashboard handles it - dynamic type names
    const cylinderDefinitions = await prisma.cylinder.findMany({
      where: {
        cylinderType: {
          in: cylinderTypes
        },
        ...regionScopedWhere(regionId),
      },
      distinct: ['cylinderType'],
      select: {
        cylinderType: true,
        typeName: true,
        capacity: true
      }
    });

    // Create a map for frontend to use: code -> { name, capacity }
    const typeDefinitions: Record<string, { name: string, capacity: number }> = {};

    cylinderDefinitions.forEach(def => {
      let displayName = 'Cylinder';

      // Use typeName from database if available (this supports "Industrial", "Special" etc)
      if (def.typeName && def.typeName.trim().toLowerCase() !== 'cylinder') {
        displayName = def.typeName.trim();
      } else {
        // Fallback or Standard Names
        const upperType = def.cylinderType.toUpperCase();
        if (upperType.includes('DOMESTIC')) displayName = 'Domestic';
        else if (upperType.includes('STANDARD')) displayName = 'Standard';
        else if (upperType.includes('COMMERCIAL')) displayName = 'Commercial';
      }

      typeDefinitions[def.cylinderType] = {
        name: displayName,
        capacity: Number(def.capacity)
      };
    });

    const summary = {
      totalCustomers,
      totalProfit: Number(profitSummary._sum.totalProfit || 0),
      totalSecurity: Number(cylinderSummary._sum.securityAmount || 0),
      cylinderBreakdown
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
      summary,
      cylinderTypes,
      typeDefinitions // Send definitions to frontend
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

    const regionId = getActiveRegionId(request);
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
      marginCategoryId
    } = body;

    // Validate required fields
    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: 'Name, phone, and address are required' },
        { status: 400 }
      );
    }

    // Check if customer with same phone already exists in this region
    const existingCustomer = await prisma.b2CCustomer.findFirst({
      where: { phone, ...regionScopedWhere(regionId) }
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists in this branch' },
        { status: 400 }
      );
    }

    const customer = await prisma.b2CCustomer.create({
      data: withRegionScope({
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
        marginCategoryId: marginCategoryId || null,
        totalProfit: 0
      }, regionId)
    });

    try {
      const link = `/customers/b2c/${customer.id}`;
      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2C_CUSTOMER_CREATED,
        entityType: 'B2C_CUSTOMER',
        entityId: customer.id,
        details: `Created B2C customer "${customer.name}" • Phone: ${customer.phone}`,
        link,
        metadata: {
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
        },
      });
      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: 'New B2C customer added',
        message: `${session.user.name || session.user.email} added B2C customer "${customer.name}".`,
        link,
        priority: 'MEDIUM',
        regionId,
        metadata: {
          domain: 'B2C_CUSTOMER',
          customerId: customer.id,
          customerName: customer.name,
        },
      });
    } catch (sideEffectError) {
      console.error('B2C customer create side effects failed:', sideEffectError);
    }

    return NextResponse.json(customer, { status: 201 });

  } catch (error) {
    console.error('Error creating B2C customer:', error);
    return NextResponse.json(
      { error: 'Failed to create B2C customer' },
      { status: 500 }
    );
  }
}
