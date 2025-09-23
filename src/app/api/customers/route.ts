import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { createCustomerAddedNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      isActive: true,
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
    const userRole = request.headers.get('x-user-role');
    
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
      console.log('Looking for any admin user to use instead...');
      
      // If user not found, try to find any admin user
      user = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, email: true }
      });
      
      if (!user) {
        console.log('No admin users found in database');
        return NextResponse.json({ error: 'No valid user found' }, { status: 401 });
      }
      
      console.log('Using admin user instead:', user);
    } else {
      console.log('User found:', user);
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      customerType,
      creditLimit
    } = body;

    // Generate unique customer code
    const customerCount = await prisma.customer.count();
    const code = `CUST${String(customerCount + 1).padStart(3, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        code,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        state,
        postalCode,
        customerType,
        creditLimit: parseFloat(creditLimit) || 0,
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for new customer
    try {
      const userEmail = request.headers.get('x-user-email') || 'Unknown User';
      await createCustomerAddedNotification(
        `${firstName} ${lastName}`,
        userEmail,
        code
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the main operation if notification fails
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
