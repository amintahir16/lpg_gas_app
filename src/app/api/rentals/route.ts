import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRentalCreatedNotification } from '@/lib/notifications';
import { requireRoles, clampLimit } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(['USER', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth.ok) return auth.response;
    const userId = auth.session.user.id;
    const userEmail = auth.session.user.email || 'Unknown User';

    const data = await request.json();
    const { cylinderType, duration, rentalDate, expectedReturnDate, rentalAmount } = data;

    if (!cylinderType || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: { userId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const availableCylinder = await prisma.cylinder.findFirst({
      where: {
        cylinderType: cylinderType === '15KG' ? 'KG_15' : 'KG_45',
        currentStatus: 'AVAILABLE',
      },
    });

    if (!availableCylinder) {
      return NextResponse.json({ error: 'No available cylinders of this type' }, { status: 404 });
    }

    const calculatedAmount = rentalAmount || (cylinderType === '15KG' ? 150 : 450) * duration;

    const rental = await prisma.cylinderRental.create({
      data: {
        customerId: customer.id,
        cylinderId: availableCylinder.id,
        userId,
        rentalDate: rentalDate ? new Date(rentalDate) : new Date(),
        expectedReturnDate: expectedReturnDate
          ? new Date(expectedReturnDate)
          : new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        rentalAmount: calculatedAmount,
        status: 'ACTIVE',
        notes: `Rental for ${duration} days`,
      },
      include: {
        customer: { select: { name: true, contactPerson: true, email: true } },
        cylinder: { select: { code: true, cylinderType: true, capacity: true } },
      },
    });

    await prisma.cylinder.update({
      where: { id: availableCylinder.id },
      data: { currentStatus: 'WITH_CUSTOMER' },
    });

    try {
      await createRentalCreatedNotification(rental.customer.name, rental.cylinder.code, userEmail);
    } catch (notificationError) {
      console.error('Failed to create rental notification:', notificationError);
    }

    return NextResponse.json({
      message: 'Rental created successfully',
      rental: {
        id: rental.id,
        customerName: rental.customer.name,
        cylinderCode: rental.cylinder.code,
        cylinderType: rental.cylinder.cylinderType,
        rentalDate: rental.rentalDate.toISOString().split('T')[0],
        expectedReturnDate: rental.expectedReturnDate?.toISOString().split('T')[0],
        status: rental.status,
        amount: Number(rental.rentalAmount),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Rental creation error:', error);
    return NextResponse.json({ error: 'Failed to create rental' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(['USER', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth.ok) return auth.response;
    const userId = auth.session.user.id;

    const customer = await prisma.customer.findFirst({
      where: { userId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 10);
    const skip = (page - 1) * limit;

    const [rentals, total] = await Promise.all([
      prisma.cylinderRental.findMany({
        where: { customerId: customer.id },
        skip,
        take: limit,
        orderBy: { rentalDate: 'desc' },
        include: {
          cylinder: { select: { code: true, cylinderType: true, capacity: true } },
        },
      }),
      prisma.cylinderRental.count({ where: { customerId: customer.id } }),
    ]);

    const formattedRentals = rentals.map(rental => ({
      id: rental.id,
      cylinderCode: rental.cylinder.code,
      cylinderType: rental.cylinder.cylinderType,
      rentalDate: rental.rentalDate.toISOString().split('T')[0],
      expectedReturnDate: rental.expectedReturnDate?.toISOString().split('T')[0],
      actualReturnDate: rental.actualReturnDate?.toISOString().split('T')[0] || null,
      status: rental.status,
      amount: Number(rental.rentalAmount),
    }));

    return NextResponse.json({
      rentals: formattedRentals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Rental fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch rentals' }, { status: 500 });
  }
}
