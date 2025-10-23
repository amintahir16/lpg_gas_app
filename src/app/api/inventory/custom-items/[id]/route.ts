import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT - Update custom item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, quantity, costPerPiece, totalCost } = body;

    // Validate required fields
    if (!name || !type || quantity === undefined || costPerPiece === undefined || totalCost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if custom item exists
    const existingItem = await prisma.customItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Custom item not found' },
        { status: 404 }
      );
    }

    // Check if another custom item with same name AND type exists (excluding current item)
    const duplicateItem = await prisma.customItem.findFirst({
      where: {
        name,
        type,
        isActive: true,
        id: { not: id }
      }
    });

    if (duplicateItem) {
      return NextResponse.json(
        { error: 'Item with this type already exists in this category' },
        { status: 400 }
      );
    }

    const customItem = await prisma.customItem.update({
      where: { id },
      data: {
        name,
        type,
        quantity: parseInt(quantity),
        costPerPiece: parseFloat(costPerPiece),
        totalCost: parseFloat(totalCost)
      }
    });

    return NextResponse.json({ customItem });
  } catch (error) {
    console.error('Failed to update custom item:', error);
    return NextResponse.json(
      { error: 'Failed to update custom item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete custom item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if custom item exists
    const existingItem = await prisma.customItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Custom item not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.customItem.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ message: 'Custom item deleted successfully' });
  } catch (error) {
    console.error('Failed to delete custom item:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom item' },
      { status: 500 }
    );
  }
}
