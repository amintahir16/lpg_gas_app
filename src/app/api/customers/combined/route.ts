import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { clampLimit } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 10);
    const filterStatus = searchParams.get('status') || 'ALL'; // 'ACTIVE' | 'INACTIVE' | 'ALL'
    const filterType = searchParams.get('type') || 'ALL'; // 'B2B' | 'B2C' | 'ALL'
    const skip = (page - 1) * limit;

    // Build search conditions for both B2B and B2C customers (region-scoped)
    let b2bWhere: any = { ...regionScope };
    if (search) {
      b2bWhere.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ];
    }

    let b2cWhere: any = { ...regionScope };
    if (search) {
      b2cWhere.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { address: { contains: search } },
        { houseNumber: { contains: search } },
        { sector: { contains: search } },
        { street: { contains: search } },
        { phase: { contains: search } },
        { area: { contains: search } }
      ];
    }

    // Apply Status Filter
    if (filterStatus === 'ACTIVE') {
      b2bWhere.isActive = true;
      b2cWhere.isActive = true;
    } else if (filterStatus === 'INACTIVE') {
      b2bWhere.isActive = false;
      b2cWhere.isActive = false;
    }

    // Fetch B2B customers if filterType is 'ALL' or 'B2B'
    let b2bCustomers: any[] = [];
    let b2bTotal = 0;

    if (filterType === 'ALL' || filterType === 'B2B') {
      const results = await Promise.all([
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
      b2bCustomers = results[0];
      b2bTotal = results[1];
    }

    // Fetch B2C customers if filterType is 'ALL' or 'B2C'
    let b2cCustomers: any[] = [];
    let b2cTotal = 0;
    let b2cSecurity = { _sum: { securityAmount: 0 } };

    if (filterType === 'ALL' || filterType === 'B2C') {
      const results = await Promise.all([
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
        // Sum all B2C security on cylinders with filtered customers
        prisma.b2CCylinderHolding.aggregate({
          where: {
            isReturned: false,
            customer: b2cWhere // Respect filters exactly like the route
          },
          _sum: { securityAmount: true }
        })
      ]);
      b2cCustomers = results[0] as any;
      b2cTotal = results[1] as number;
      b2cSecurity = results[2] as any;
    }

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
    // Actually the B2B dashboard does: totalReceivables = sum(ledgerBalance > 0). It displays formatCurrency(-totalReceivables). Let's stick to the same logic:
    // Actually, B2B sum logic iterates. We just use the raw sum of ALL minus ledger balances for B2B.
    let totalReceivables = 0;
    if (filterType === 'ALL' || filterType === 'B2B') {
      const allB2b = await prisma.customer.findMany({
        where: b2bWhere, // filter by status/search
        select: { ledgerBalance: true }
      });

      totalReceivables = allB2b.reduce((sum, c) => {
        return sum + (Number(c.ledgerBalance) > 0 ? Number(c.ledgerBalance) : 0);
      }, 0);
    }

    const totalSecurityHoldings = Number(b2cSecurity._sum.securityAmount || 0);

    // Fetch total cylinders in circulation (any cylinder attached to a customer and not returned)
    // To respect the filtered customers, we might just query the total cylinders if filter is ALL, but if applying status filters, we'd need to filter cylinders.
    // For simplicity, we just count the `WITH_CUSTOMER` global cylinders, or we can filter by the combined customers.
    // To match B2C dashboard, we just keep totalCylindersCount as global unless specified, wait user said "these filters should work on the stat card too".

    let b2cCylindersHeld = 0;
    if (filterType === 'ALL' || filterType === 'B2C') {
      const b2cCylinderAgg = await prisma.b2CCylinderHolding.aggregate({
        where: { isReturned: false, customer: b2cWhere },
        _sum: { quantity: true }
      });
      b2cCylindersHeld = b2cCylinderAgg._sum.quantity || 0;
    }

    let b2bCylindersHeld = 0;
    if (filterType === 'ALL' || filterType === 'B2B') {
      // Just grab the B2B customers IDs
      const b2bIds = b2bCustomers.map(c => c.id);
      const b2bCylAgg = await prisma.cylinderRental.count({
        where: {
          status: 'ACTIVE',
          customerId: { in: b2bIds }
        }
      });

      // And search by location containing ID
      const locMatches = b2bIds.map(id => ({ location: { contains: id } }));
      const nameMatches = b2bCustomers.map(c => ({ location: { contains: c.name } }));

      const b2bCylsLocationCount = await prisma.cylinder.count({
        where: {
          currentStatus: 'WITH_CUSTOMER',
          OR: [
            ...locMatches,
            ...nameMatches
          ]
        }
      });
      // Roughly picking the max or combining logic
      // As implemented in B2B route:
      const assignedCylinders = await prisma.cylinder.findMany({
        where: {
          currentStatus: 'WITH_CUSTOMER',
          OR: [
            { cylinderRentals: { some: { customerId: { in: b2bIds }, status: 'ACTIVE' } } },
            ...locMatches,
            ...nameMatches
          ]
        },
        select: { cylinderType: true }
      });
      b2bCylindersHeld = assignedCylinders.length;
    }

    const totalCylindersCount = b2cCylindersHeld + b2bCylindersHeld;

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
