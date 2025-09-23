import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'B2B';

    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause = {
      type: type,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { contactPerson: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching B2B customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch B2B customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
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
      name,
      contactPerson,
      email,
      phone,
      address,
      creditLimit,
      paymentTermsDays,
      notes,
      customerType,
      type = 'B2B'
    } = body;

    // Combine customer type with notes
    const combinedNotes = customerType ? 
      `Customer Type: ${customerType}${notes ? ` | ${notes}` : ''}` : 
      notes;

    const customer = await prisma.customer.create({
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
        notes: combinedNotes,
        type,
        createdBy: user.id,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating B2B customer:', error);
    return NextResponse.json(
      { error: 'Failed to create B2B customer' },
      { status: 500 }
    );
  }
}
