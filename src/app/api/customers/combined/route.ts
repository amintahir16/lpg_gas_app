import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { clampLimit } from '@/lib/apiAuth';
import { getDailyActiveB2BCustomerIds } from '@/lib/b2b-activity-cache';

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
        { name: { contains: search, mode: 'insensitive' as const } },
        { contactPerson: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
      ];
    }

    let b2cWhere: any = { ...regionScope };
    if (search) {
      b2cWhere.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { houseNumber: { contains: search, mode: 'insensitive' as const } },
        { sector: { contains: search, mode: 'insensitive' as const } },
        { street: { contains: search, mode: 'insensitive' as const } },
        { phase: { contains: search, mode: 'insensitive' as const } },
        { area: { contains: search, mode: 'insensitive' as const } }
      ];
    }

    // Apply Status Filter
    if (filterStatus === 'ACTIVE') {
      b2cWhere.isActive = true;
    } else if (filterStatus === 'INACTIVE') {
      b2cWhere.isActive = false;
    }

    // Fetch B2B customers if filterType is 'ALL' or 'B2B'
    let b2bCustomers: any[] = [];
    let activeB2bIds = new Set<string>();

    if (filterType === 'ALL' || filterType === 'B2B') {
      const [fetchedB2b, b2bActiveSet] = await Promise.all([
        prisma.customer.findMany({
          where: b2bWhere,
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
            creditLimit: true,
            ledgerBalance: true,
            isActive: true,
            createdAt: true,
            notes: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        getDailyActiveB2BCustomerIds(regionId),
      ]);
      b2bCustomers = fetchedB2b;
      activeB2bIds = b2bActiveSet;
    }

    // Fetch B2C customers if filterType is 'ALL' or 'B2C'
    let b2cCustomers: any[] = [];
    let b2cSecurity: { _sum: { securityAmount?: number | null; quantity?: number | null } } = {
      _sum: { securityAmount: 0, quantity: 0 },
    };

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
        prisma.b2CCylinderHolding.aggregate({
          where: {
            isReturned: false,
            customer: b2cWhere // Respect filters exactly like the route
          },
          _sum: { securityAmount: true, quantity: true }
        })
      ]);
      b2cCustomers = results[0] as any;
      b2cSecurity = results[1] as any;
    }

    // Transform B2B customers to unified format with 7-day activity check
    let transformedB2bCustomers = b2bCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      type: 'B2B',
      creditLimit: customer.creditLimit,
      ledgerBalance: customer.ledgerBalance,
      isActive: customer.isActive && activeB2bIds.has(customer.id),
      createdAt: customer.createdAt,
      notes: customer.notes
    }));

    if (filterStatus === 'ACTIVE') {
      transformedB2bCustomers = transformedB2bCustomers.filter(c => c.isActive);
    } else if (filterStatus === 'INACTIVE') {
      transformedB2bCustomers = transformedB2bCustomers.filter(c => !c.isActive);
    }
    const b2bTotal = transformedB2bCustomers.length;

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
    const b2cTotal = transformedB2cCustomers.length;

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

    // Calculate total receivables from B2B customers
    let totalReceivables = 0;
    if (filterType === 'ALL' || filterType === 'B2B') {
      totalReceivables = transformedB2bCustomers.reduce((sum, c) => {
        return sum + (Number(c.ledgerBalance) > 0 ? Number(c.ledgerBalance) : 0);
      }, 0);
    }

    const totalSecurityHoldings = Number(b2cSecurity._sum?.securityAmount || 0);
    const b2cCylindersHeld = Number(b2cSecurity._sum?.quantity || 0);

    let b2bCylindersHeld = 0;
    if ((filterType === 'ALL' || filterType === 'B2B') && b2bCustomers.length > 0) {
      const b2bIds = b2bCustomers.map(c => c.id);
      const locMatches = b2bIds.map(id => ({ location: { contains: id } }));
      const nameMatches = b2bCustomers.map(c => ({ location: { contains: c.name, mode: 'insensitive' as const } }));

      const assignedCylinders = await prisma.cylinder.findMany({
        where: {
          currentStatus: 'WITH_CUSTOMER',
          ...regionScopedWhere(regionId),
          OR: [
            { cylinderRentals: { some: { customerId: { in: b2bIds }, status: 'ACTIVE' } } },
            ...locMatches,
            ...nameMatches
          ]
        },
        select: { id: true }
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
