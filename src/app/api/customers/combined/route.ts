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
    const [b2bCustomers, b2bTotal, b2bAllBalance] = await Promise.all([
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
      prisma.customer.count({ where: b2bWhere }),
      // To get global receivables, we don't paginate
      prisma.customer.aggregate({
        _sum: {
          ledgerBalance: true
        }
      })
    ]);

    // Fetch B2C customers
    const [b2cCustomers, b2cTotal, b2cSecurity] = await Promise.all([
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
      prisma.b2CCustomer.count({ where: b2cWhere }),
      // Sum all B2C security on cylinders with customers
      prisma.b2CCylinderHolding.aggregate({
        where: { isReturned: false },
        _sum: { securityAmount: true }
      })
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

    // Calculate summary statistics
    const totalCustomers = b2bTotal + b2cTotal;
    const totalB2bCustomers = b2bTotal;
    const totalB2cCustomers = b2cTotal;

    // Ledger balance in B2B is negative if they owe money usually, wait, let's check B2B route:
    // It assumes: (Number(c.ledgerBalance) > 0 ? Number(c.ledgerBalance) : 0) -> Wait, B2B route logic has `-customer.ledgerBalance` displayed in red to mean they owe.
    // Let's do raw ledger balance sum and assume > 0 means they owe based on your schema or < 0 means they owe (B2B frontend uses `-c.ledgerBalance`).
    // Actually the B2B dashboard does: totalReceivables = sum(ledgerBalance > 0). It displays formatCurrency(-totalReceivables). Let's stick to the same logic:
    // Actually, B2B sum logic iterates. We just use the raw sum of ALL minus ledger balances for B2B.
    const allB2b = await prisma.customer.findMany({
      select: { ledgerBalance: true }
    });

    const totalReceivables = allB2b.reduce((sum, c) => {
      return sum + (Number(c.ledgerBalance) > 0 ? Number(c.ledgerBalance) : 0);
    }, 0);

    const totalSecurityHoldings = Number(b2cSecurity._sum.securityAmount || 0);

    // Fetch total cylinders in circulation (any cylinder attached to a customer and not returned, or specifically WITH_CUSTOMER in status)
    const totalCylindersCount = await prisma.cylinder.count({
      where: {
        currentStatus: 'WITH_CUSTOMER'
      }
    });

    const summary = {
      totalCustomers,
      totalB2bCustomers,
      totalB2cCustomers,
      totalReceivables,
      totalSecurityHoldings,
      totalCylindersCount
    };

    return NextResponse.json({
      customers: paginatedCustomers,
      summary,
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
