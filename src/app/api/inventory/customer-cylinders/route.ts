import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    // Build where clause
    const where: any = {
      currentStatus: 'WITH_CUSTOMER'
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { cylinderRentals: { some: { customer: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } }
          ]
        }}}}
      ];
    }

    if (type) {
      where.cylinderType = type;
    }

    // Get cylinders with customers
    const cylinders = await prisma.cylinder.findMany({
      where,
      include: {
        cylinderRentals: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                firstName: true,
                lastName: true,
                phone: true,
                address: true,
                city: true
              }
            }
          },
          orderBy: {
            rentalDate: 'desc'
          },
          take: 1 // Get the latest rental
        }
      }
    });

    // Process the data to match the expected format
    const customerCylinders = cylinders
      .filter(cylinder => cylinder.cylinderRentals.length > 0)
      .map(cylinder => ({
        id: cylinder.id,
        code: cylinder.code,
        cylinderType: cylinder.cylinderType,
        currentStatus: cylinder.currentStatus,
        customer: cylinder.cylinderRentals[0].customer,
        rental: {
          id: cylinder.cylinderRentals[0].id,
          rentalDate: cylinder.cylinderRentals[0].rentalDate,
          expectedReturnDate: cylinder.cylinderRentals[0].expectedReturnDate,
          rentalAmount: cylinder.cylinderRentals[0].rentalAmount,
          depositAmount: cylinder.cylinderRentals[0].depositAmount,
          status: cylinder.cylinderRentals[0].status
        }
      }));

    // Apply status filter
    const filteredCylinders = status ? 
      customerCylinders.filter(item => item.rental.status === status) : 
      customerCylinders;

    return NextResponse.json({
      success: true,
      customerCylinders: filteredCylinders
    });
  } catch (error) {
    console.error('Error fetching customer cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer cylinders' },
      { status: 500 }
    );
  }
}
