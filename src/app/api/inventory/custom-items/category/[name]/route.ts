import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

// PUT - Update category name (rename category)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const regionId = getActiveRegionId(request);
    const { name: oldName } = await params;
    const body = await request.json();
    const { newName } = body;

    if (!newName) {
      return NextResponse.json(
        { success: false, error: 'New category name is required' },
        { status: 400 }
      );
    }

    // Check if old category exists in this region
    const existingItems = await prisma.customItem.findMany({
      where: { 
        name: oldName,
        isActive: true,
        ...regionScopedWhere(regionId),
      }
    });

    if (existingItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if new name already exists in this region
    const duplicateCategory = await prisma.customItem.findFirst({
      where: { 
        name: newName,
        isActive: true,
        ...regionScopedWhere(regionId),
      }
    });

    if (duplicateCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    // Update all items in the category for this region
    await prisma.customItem.updateMany({
      where: { 
        name: oldName,
        isActive: true,
        ...regionScopedWhere(regionId),
      },
      data: { name: newName }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Category renamed from "${oldName}" to "${newName}"` 
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE - Delete entire category (soft delete all items in category)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const regionId = getActiveRegionId(request);
    const { name } = await params;

    // Check if category exists in this region
    const existingItems = await prisma.customItem.findMany({
      where: { 
        name: name,
        isActive: true,
        ...regionScopedWhere(regionId),
      }
    });

    if (existingItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Soft delete all items in the category for this region
    await prisma.customItem.updateMany({
      where: { 
        name: name,
        isActive: true,
        ...regionScopedWhere(regionId),
      },
      data: { isActive: false }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Category "${name}" and all its items deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
