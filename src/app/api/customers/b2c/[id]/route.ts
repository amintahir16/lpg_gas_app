import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = params.id;

    const customer = await prisma.b2CCustomer.findUnique({
      where: { id: customerId },
      include: {
        cylinderHoldings: {
          orderBy: { issueDate: 'desc' }
        },
        transactions: {
          include: {
            gasItems: true,
            securityItems: true,
            accessoryItems: true
          },
          orderBy: { date: 'desc' }
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = params.id;
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
      googleMapLocation,
      isActive
    } = body;

    // Validate required fields
    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: 'Name, phone, and address are required' },
        { status: 400 }
      );
    }

    // Check if another customer with same phone already exists
    const existingCustomer = await prisma.b2CCustomer.findFirst({
      where: { 
        phone,
        id: { not: customerId }
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
        googleMapLocation: googleMapLocation || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = params.id;

    // Check if customer has any transactions or cylinder holdings
    const [transactions, holdings] = await Promise.all([
      prisma.b2CTransaction.count({
        where: { customerId }
      }),
      prisma.b2CCylinderHolding.count({
        where: { customerId, isReturned: false }
      })
    ]);

    if (transactions > 0 || holdings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing transactions or active cylinder holdings' },
        { status: 400 }
      );
    }

    await prisma.b2CCustomer.delete({
      where: { id: customerId }
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });

  } catch (error) {
    console.error('Error deleting B2C customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
