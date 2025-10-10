import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET all vendors or filter by category
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search') || '';

    const where: any = {
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        category: true,
        purchases: {
          select: {
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate totals for each vendor
    const vendorsWithTotals = vendors.map(vendor => {
      const totalPurchases = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.totalAmount), 0
      );
      const totalPaid = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.paidAmount), 0
      );
      const totalBalance = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.balanceAmount), 0
      );

      return {
        ...vendor,
        totalPurchases,
        totalPaid,
        totalBalance,
        purchases: undefined
      };
    });

    return NextResponse.json({ vendors: vendorsWithTotals });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST - Create new vendor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, categoryId, contactPerson, phone, email, address } = body;

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Generate vendor code
    const count = await prisma.vendor.count();
    const vendorCode = `VND-${String(count + 1).padStart(5, '0')}`;

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode,
        name,
        companyName: name,
        categoryId,
        contactPerson,
        phone,
        email,
        address
      },
      include: {
        category: true
      }
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}

// PUT - Update vendor
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, contactPerson, phone, email, address, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.companyName = name;
    }
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (isActive !== undefined) updateData.isActive = isActive;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// DELETE - Delete vendor
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.vendor.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}

