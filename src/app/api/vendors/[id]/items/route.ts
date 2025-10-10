import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET all items for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const items = await prisma.vendorItem.findMany({
      where: {
        vendorId: id,
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching vendor items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST - Add item to vendor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, category, defaultUnit } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    // Get max sort order
    const maxSort = await prisma.vendorItem.findFirst({
      where: { vendorId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });

    const item = await prisma.vendorItem.create({
      data: {
        vendorId: id,
        name,
        description,
        category: category || 'General',
        defaultUnit: defaultUnit || 'piece',
        sortOrder: (maxSort?.sortOrder || 0) + 1
      }
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}

// PUT - Update vendor item
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, category, defaultUnit, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (defaultUnit !== undefined) updateData.defaultUnit = defaultUnit;
    if (isActive !== undefined) updateData.isActive = isActive;

    const item = await prisma.vendorItem.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating vendor item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete vendor item
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
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.vendorItem.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}

