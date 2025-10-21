import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PUT - Update vendor item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const body = await request.json();
    const { name, description, category } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    // Check if item exists and belongs to vendor
    const existingItem = await prisma.vendorInventory.findFirst({
      where: {
        id: itemId,
        vendorId: id
      }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Update item
    const updatedItem = await prisma.vendorInventory.update({
      where: { id: itemId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Item updated successfully',
      item: updatedItem
    });

  } catch (error) {
    console.error('Error updating vendor item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete vendor item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;

    // Check if item exists and belongs to vendor
    const existingItem = await prisma.vendorInventory.findFirst({
      where: {
        id: itemId,
        vendorId: id
      }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Delete item
    await prisma.vendorInventory.delete({
      where: { id: itemId }
    });

    return NextResponse.json({
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting vendor item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
