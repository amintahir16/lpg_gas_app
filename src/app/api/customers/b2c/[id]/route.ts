import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter for transactions
    const transactionWhere: any = {};
    if (startDate || endDate) {
      transactionWhere.date = {};
      if (startDate) {
        transactionWhere.date.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date (up to 23:59:59.999)
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        transactionWhere.date.lte = endDateObj;
      }
    }

    const customer = await prisma.b2CCustomer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
      include: {
        cylinderHoldings: {
          orderBy: { issueDate: 'desc' }
        },
        transactions: {
          where: Object.keys(transactionWhere).length > 0 ? transactionWhere : undefined,
          include: {
            gasItems: true,
            securityItems: true,
            accessoryItems: true
          },
          orderBy: [
            { date: 'desc' },
            { time: 'desc' }
          ]
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);

  } catch (error) {
    console.error('Error fetching B2C customer details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id: customerId } = await params;
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
      city,
      isActive,
      marginCategoryId
    } = body;

    // Validate required fields
    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: 'Name, phone, and address are required' },
        { status: 400 }
      );
    }

    // Region-scope guard: ensure the customer belongs to the active region
    const customerScopeCheck = await prisma.b2CCustomer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
      select: { id: true }
    });

    if (!customerScopeCheck) {
      return NextResponse.json({ error: 'Customer not found in current region' }, { status: 404 });
    }

    // Check if another customer with same phone already exists in the same region
    const existingCustomer = await prisma.b2CCustomer.findFirst({
      where: {
        phone,
        id: { not: customerId },
        ...regionScopedWhere(regionId),
      }
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Another customer with this phone number already exists' },
        { status: 400 }
      );
    }

    const customer = await prisma.b2CCustomer.update({
      where: { id: customerId },
      data: {
        name,
        phone,
        email: email || null,
        address,
        houseNumber: houseNumber || null,
        sector: sector || null,
        street: street || null,
        phase: phase || null,
        area: area || null,
        city: city || 'Hayatabad',
        isActive: isActive !== undefined ? isActive : true,
        marginCategoryId: marginCategoryId || null
      }
    });

    try {
      const link = `/customers/b2c/${customer.id}`;
      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2C_CUSTOMER_UPDATED,
        entityType: 'B2C_CUSTOMER',
        entityId: customer.id,
        details: `Updated B2C customer "${customer.name}"`,
        link,
        metadata: {
          customerId: customer.id,
          customerName: customer.name,
        },
      });
      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: 'B2C customer updated',
        message: `${session.user.name || session.user.email} updated B2C customer "${customer.name}".`,
        link,
        priority: 'LOW',
        regionId,
        metadata: {
          domain: 'B2C_CUSTOMER',
          customerId: customer.id,
          customerName: customer.name,
        },
      });
    } catch (sideEffectError) {
      console.error('B2C customer update side effects failed:', sideEffectError);
    }

    return NextResponse.json(customer);

  } catch (error) {
    console.error('Error updating B2C customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id: customerId } = await params;

    // Region-scope guard: ensure the customer belongs to the active region
    const customerScopeCheck = await prisma.b2CCustomer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
      select: { id: true }
    });

    if (!customerScopeCheck) {
      return NextResponse.json({ error: 'Customer not found in current region' }, { status: 404 });
    }

    // Check if customer has any active cylinder holdings
    const holdings = await prisma.b2CCylinderHolding.count({
      where: { customerId, isReturned: false }
    });

    if (holdings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with active cylinder holdings' },
        { status: 400 }
      );
    }

    const existing = await prisma.b2CCustomer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true }
    });

    await prisma.b2CCustomer.delete({
      where: { id: customerId }
    });

    try {
      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2C_CUSTOMER_DELETED,
        entityType: 'B2C_CUSTOMER',
        entityId: customerId,
        details: `Deleted B2C customer "${existing?.name ?? customerId}"`,
        link: '/customers/b2c',
        metadata: {
          customerId,
          customerName: existing?.name ?? null,
        },
      });
      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: 'B2C customer deleted',
        message: `${session.user.name || session.user.email} deleted B2C customer "${existing?.name ?? customerId}".`,
        link: '/customers/b2c',
        priority: 'HIGH',
        regionId,
        metadata: {
          domain: 'B2C_CUSTOMER',
          customerId,
          customerName: existing?.name ?? null,
        },
      });
    } catch (sideEffectError) {
      console.error('B2C customer delete side effects failed:', sideEffectError);
    }

    return NextResponse.json({ message: 'Customer deleted successfully' });

  } catch (error) {
    console.error('Error deleting B2C customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
