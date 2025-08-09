import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For customer rentals, we need to get the customer ID from the user
    const customer = await prisma.customer.findFirst({
      where: { userId: userId }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [rentals, total] = await Promise.all([
      prisma.cylinderRental.findMany({
        where: { customerId: customer.id },
        skip,
        take: limit,
        orderBy: { rentalDate: 'desc' },
        include: {
          cylinder: true
        }
      }),
      prisma.cylinderRental.count({
        where: { customerId: customer.id }
      })
    ]);

    const formattedRentals = rentals.map(rental => ({
      id: rental.id,
      cylinderCode: rental.cylinder.code,
      cylinderType: rental.cylinder.cylinderType,
      rentalDate: rental.rentalDate.toISOString().split('T')[0],
      expectedReturnDate: rental.expectedReturnDate.toISOString().split('T')[0],
      actualReturnDate: rental.actualReturnDate?.toISOString().split('T')[0] || null,
      status: rental.status,
      amount: rental.rentalAmount
    }));

    return NextResponse.json({
      rentals: formattedRentals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Customer rentals fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer rentals' },
      { status: 500 }
    );
  }
} 