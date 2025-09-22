import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      contactPerson, 
      email, 
      phone, 
      address, 
      creditLimit, 
      paymentTermsDays,
      notes 
    } = body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        creditLimit: creditLimit || 0,
        paymentTermsDays: paymentTermsDays || 30,
        notes,
        updatedBy: userId,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
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
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete by setting isActive to false
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: userId,
      },
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
