import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { createCustomerAddedNotification } from '@/lib/notifications';
import { getActiveRegionId, regionScopedWhere, withRegionScope } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      isActive: true,
      ...regionScopedWhere(regionId),
      OR: search ? [
        { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { contactPerson: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { phone: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      ] : undefined
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Customers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role'); // Keep for potential future role checks, though currently unused locally

    console.log('Received userId from headers:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user exists in database
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!user) {
      console.log('User not found in database:', userId);
      // Try to find any admin user as fallback (legacy logic preserved)
      user = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, email: true }
      });

      if (!user) {
        return NextResponse.json({ error: 'No valid user found' }, { status: 401 });
      }
    }

    const body = await request.json();
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      type = 'B2B',
      creditLimit,
      paymentTermsDays
    } = body;

    // Validate required fields
    if (!name || !contactPerson || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contactPerson, phone' },
        { status: 400 }
      );
    }

    const regionId = getActiveRegionId(request);
    const customer = await prisma.customer.create({
      data: withRegionScope({
        name,
        contactPerson,
        email,
        phone,
        address,
        type,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
        createdBy: user.id
      }, regionId)
    });

    // Create notification
    try {
      const userEmail = request.headers.get('x-user-email') || 'Unknown User';
      await createCustomerAddedNotification(
        customer.name,
        userEmail,
        customer.id // Using ID as code substitute since code field doesn't exist
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Customer creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
