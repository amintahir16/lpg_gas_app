import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET all vendor categories
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API called: GET /api/vendor-categories');
    
    const session = await getServerSession(authOptions);
    console.log('🔍 Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    });

    if (!session?.user?.id) {
      console.log('❌ No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 });
    }

    console.log('✅ User authenticated, fetching categories...');

    const categories = await prisma.vendorCategoryConfig.findMany({
      where: { isActive: true },
      include: {
        vendors: {
          where: { isActive: true },
          select: { id: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    console.log('📊 Found categories:', categories.length);

    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      vendorCount: cat.vendors.length,
      vendors: undefined
    }));

    console.log('✅ Returning categories:', categoriesWithCount.length);

    return NextResponse.json({ categories: categoriesWithCount });
  } catch (error) {
    console.error('❌ Error fetching vendor categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new vendor category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Check if category already exists
    const existing = await prisma.vendorCategoryConfig.findFirst({
      where: {
        OR: [
          { name },
          { slug }
        ]
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 400 }
      );
    }

    // Get max sort order
    const maxSort = await prisma.vendorCategoryConfig.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });

    const category = await prisma.vendorCategoryConfig.create({
      data: {
        name,
        slug,
        description,
        icon,
        sortOrder: (maxSort?.sortOrder || 0) + 1
      }
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// PUT - Update vendor category
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, icon, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    }
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const category = await prisma.vendorCategoryConfig.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE - Delete vendor category
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
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category has vendors
    const vendorCount = await prisma.vendor.count({
      where: { categoryId: id, isActive: true }
    });

    if (vendorCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${vendorCount} active vendor(s)` },
        { status: 400 }
      );
    }

    await prisma.vendorCategoryConfig.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}