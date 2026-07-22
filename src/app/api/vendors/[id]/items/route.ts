import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { ActivityAction, logActivity } from '@/lib/activityLogger';

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

    const regionId = getActiveRegionId(request);
    const { id } = await params;

    const items = await prisma.vendorInventory.findMany({
      where: {
        vendorId: id,
        status: 'IN_STOCK',
        ...regionScopedWhere(regionId),
      },
      orderBy: { createdAt: 'asc' }
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

    const regionId = getActiveRegionId(request);
    const { id } = await params;
    const body = await request.json();
    const { name, description, category, defaultUnit } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    // Create vendor inventory item
    const item = await prisma.vendorInventory.create({
      data: {
        vendorId: id,
        name,
        description,
        category: category || 'General',
        quantity: 0,
        unitPrice: 0,
        status: 'IN_STOCK',
        ...(regionId ? { regionId } : {}),
      }
    });

    await logActivity({
      userId: session.user.id,
      action: ActivityAction.VENDOR_ITEM_CREATED,
      entityType: 'VENDOR_INVENTORY',
      entityId: item.id,
      details: `Added vendor item "${item.name}"`,
      link: `/vendors/${id}`,
      regionId,
      metadata: {
        vendorId: id,
        itemId: item.id,
        name: item.name,
        category: item.category,
      },
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
    const { id, name, description, category, quantity, unitPrice, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const regionId = getActiveRegionId(request);
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (unitPrice !== undefined) updateData.unitPrice = Number(unitPrice);
    if (status !== undefined) updateData.status = status;

    const item = await prisma.vendorInventory.update({
      where: { id },
      data: updateData
    });

    await logActivity({
      userId: session.user.id,
      action: ActivityAction.VENDOR_ITEM_UPDATED,
      entityType: 'VENDOR_INVENTORY',
      entityId: item.id,
      details: `Updated vendor item "${item.name}"`,
      link: item.vendorId ? `/vendors/${item.vendorId}` : null,
      regionId,
      metadata: {
        vendorId: item.vendorId,
        itemId: item.id,
        name: item.name,
      },
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

    // Soft delete by changing status
    const item = await prisma.vendorInventory.update({
      where: { id },
      data: { status: 'OUT_OF_STOCK' }
    });

    const regionId = getActiveRegionId(request);
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.VENDOR_ITEM_DELETED,
      entityType: 'VENDOR_INVENTORY',
      entityId: item.id,
      details: `Removed vendor item "${item.name}"`,
      link: item.vendorId ? `/vendors/${item.vendorId}` : null,
      regionId,
      metadata: {
        vendorId: item.vendorId,
        itemId: item.id,
        name: item.name,
      },
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

