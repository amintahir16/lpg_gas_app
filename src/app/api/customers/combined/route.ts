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

    // Build search conditions for both B2B and B2C customers
    const b2bWhere = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { contactPerson: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const b2cWhere = search ? {
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

    // Fetch B2B customers
    const [b2bCustomers, b2bTotal] = await Promise.all([
      prisma.customer.findMany({
        where: b2bWhere,
        select: {
          id: true,
          name: true,
          contactPerson: true,
          email: true,
          phone: true,
          creditLimit: true,
          isActive: true,
          createdAt: true,
          notes: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where: b2bWhere })
    ]);

    // Fetch B2C customers
    const [b2cCustomers, b2cTotal] = await Promise.all([
      prisma.b2CCustomer.findMany({
        where: b2cWhere,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          totalProfit: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.b2CCustomer.count({ where: b2cWhere })
    ]);

    // Transform B2B customers to unified format
    const transformedB2bCustomers = b2bCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      type: 'B2B',
      creditLimit: customer.creditLimit,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      notes: customer.notes
    }));

    // Transform B2C customers to unified format
    const transformedB2cCustomers = b2cCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      contactPerson: customer.name, // Use name as contact person for B2C
      email: customer.email,
      phone: customer.phone,
      type: 'B2C',
      creditLimit: 0, // B2C customers don't have credit limits
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      notes: null
    }));

    // Combine and sort all customers
    const allCustomers = [...transformedB2bCustomers, ...transformedB2cCustomers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const total = b2bTotal + b2cTotal;
    const paginatedCustomers = allCustomers.slice(skip, skip + limit);

    return NextResponse.json({
      customers: paginatedCustomers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching combined customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
