import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        purchaseEntries: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        financialReports: {
          take: 1,
          orderBy: { reportDate: 'desc' }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Vendor fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
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
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      taxId,
      paymentTerms,
      category,
      isActive
    } = body;

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id }
    });

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        companyName,
        contactPerson,
        email,
        phone,
        address,
        taxId,
        paymentTerms: parseInt(paymentTerms) || 30,
        category,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        purchaseEntries: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        financialReports: {
          take: 1,
          orderBy: { reportDate: 'desc' }
        }
      }
    });

    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error('Vendor update error:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
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
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id }
    });

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ message: 'Vendor deactivated successfully' });
  } catch (error) {
    console.error('Vendor delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
