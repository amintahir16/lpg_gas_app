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
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      type = 'B2B'
    } = body;

    // Generate customer code
    const customerCount = await prisma.customer.count();
    const customerCode = `B2B${String(customerCount + 1).padStart(4, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        code: customerCode,
        name,
        contactPerson,
        email,
        phone,
        address,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
        notes,
        type,
        customerType: 'INDUSTRIAL', // Default for B2B
        firstName: contactPerson, // Required field
        lastName: '', // Required field
        userId, // Required field
        createdBy: userId,
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
