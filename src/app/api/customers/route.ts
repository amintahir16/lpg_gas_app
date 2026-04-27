import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { createCustomerAddedNotification } from '@/lib/notifications';
import { getActiveRegionId, regionScopedWhere, withRegionScope } from '@/lib/region';
import { requireAdmin, clampLimit } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 10);
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
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.session.user.id;

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
        createdBy: userId
      }, regionId)
    });

    try {
      const userEmail = auth.session.user.email || 'Unknown User';
      await createCustomerAddedNotification(
        customer.name,
        userEmail,
        customer.id
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
