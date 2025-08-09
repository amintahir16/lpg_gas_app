import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { cylinderType, duration, rentalDate, expectedReturnDate, rentalAmount } = data;
    
    if (!cylinderType || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the customer ID from the user
    const customer = await prisma.customer.findFirst({
      where: {
        userId: userId
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Find an available cylinder of the requested type
    const availableCylinder = await prisma.cylinder.findFirst({
      where: {
        cylinderType: cylinderType === '15KG' ? 'KG_15' : 'KG_45',
        currentStatus: 'AVAILABLE'
      }
    });

    if (!availableCylinder) {
      return NextResponse.json({ error: 'No available cylinders of this type' }, { status: 404 });
    }

    // Calculate rental amount if not provided
    const calculatedAmount = rentalAmount || (cylinderType === '15KG' ? 150 : 450) * duration;

    // Create the rental
    const rental = await prisma.cylinderRental.create({
      data: {
        customerId: customer.id,
        cylinderId: availableCylinder.id,
        userId: userId,
        rentalDate: rentalDate ? new Date(rentalDate) : new Date(),
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        rentalAmount: calculatedAmount,
        status: 'ACTIVE',
        notes: `Rental for ${duration} days`
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        cylinder: {
          select: {
            code: true,
            cylinderType: true,
            capacity: true
          }
        }
      }
    });

    // Update cylinder status to RENTED
    await prisma.cylinder.update({
      where: {
        id: availableCylinder.id
      },
      data: {
        currentStatus: 'RENTED'
      }
    });

    return NextResponse.json({
      message: 'Rental created successfully',
      rental: {
        id: rental.id,
        customerName: `${rental.customer.firstName} ${rental.customer.lastName}`,
        cylinderCode: rental.cylinder.code,
        cylinderType: rental.cylinder.cylinderType,
        rentalDate: rental.rentalDate.toISOString().split('T')[0],
        expectedReturnDate: rental.expectedReturnDate?.toISOString().split('T')[0],
        status: rental.status,
        amount: Number(rental.rentalAmount)
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Rental creation error:', error);
    return NextResponse.json({ error: 'Failed to create rental' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the customer ID from the user
    const customer = await prisma.customer.findFirst({
      where: {
        userId: userId
      }
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
          cylinder: {
            select: {
              code: true,
              cylinderType: true,
              capacity: true
            }
          }
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
      expectedReturnDate: rental.expectedReturnDate?.toISOString().split('T')[0],
      actualReturnDate: rental.actualReturnDate?.toISOString().split('T')[0] || null,
      status: rental.status,
      amount: Number(rental.rentalAmount)
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
    console.error('Rental fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch rentals' }, { status: 500 });
  }
}