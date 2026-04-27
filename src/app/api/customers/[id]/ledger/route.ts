import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const regionId = getActiveRegionId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      customerId: id,
      voided: false,
      ...regionScopedWhere(regionId),
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.b2BTransaction.findMany({
        where: whereClause,
        include: {
          items: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.b2BTransaction.count({ where: whereClause }),
    ]);

    // Get customer info (region-scoped)
    const customer = await prisma.customer.findFirst({
      where: { id, ...regionScopedWhere(regionId) },
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        ledgerBalance: true,
        domestic118kgDue: true,
        standard15kgDue: true,
        commercial454kgDue: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      customer,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer ledger' },
      { status: 500 }
    );
  }
}
