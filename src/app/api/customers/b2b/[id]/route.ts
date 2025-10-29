import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { marginCategory: true }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching B2B customer:', error);
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;
    const body = await request.json();
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      creditLimit,
      paymentTermsDays,
      notes,
      isActive,
      marginCategoryId
    } = body;

    // Validate required fields only if they are being updated
    if (name !== undefined && (!name || !contactPerson || !phone)) {
      return NextResponse.json(
        { error: 'Name, contact person, and phone are required' },
        { status: 400 }
      );
    }

    // Check if another customer with same phone already exists (only if phone is being updated)
    if (phone) {
      const existingCustomer = await prisma.customer.findFirst({
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
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address || null;
    if (creditLimit !== undefined) updateData.creditLimit = creditLimit ? parseFloat(creditLimit) : 0;
    if (paymentTermsDays !== undefined) updateData.paymentTermsDays = paymentTermsDays ? parseInt(paymentTermsDays) : 30;
    if (notes !== undefined) updateData.notes = notes || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (marginCategoryId !== undefined) updateData.marginCategoryId = marginCategoryId || null;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      include: { marginCategory: true }
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating B2B customer:', error);
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

    const { id: customerId } = await params;

    // Check if customer has any transactions
    const transactionCount = await prisma.b2BTransaction.count({
      where: { customerId }
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing transactions. Please void transactions first.' },
        { status: 400 }
      );
    }

    // Check if customer has any cylinder holdings
    const cylinderCount = await prisma.cylinder.count({
      where: { 
        currentStatus: 'WITH_CUSTOMER',
        location: {
          contains: customerId
        }
      }
    });

    if (cylinderCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with active cylinder holdings. Please return cylinders first.' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      message: 'Customer deleted successfully',
      customer: {
        id: customer.id,
        name: customer.name,
        isActive: customer.isActive
      }
    });

  } catch (error) {
    console.error('Error deleting B2B customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}