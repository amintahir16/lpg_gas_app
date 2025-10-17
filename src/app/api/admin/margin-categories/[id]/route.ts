import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/margin-categories/[id] - Get single margin category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const category = await prisma.marginCategory.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            b2cCustomers: true,
            b2bCustomers: true
          }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Margin category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching margin category:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch margin category' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/margin-categories/[id] - Update margin category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, marginPerKg, description, isActive } = body;

    // Check if category exists
    const existingCategory = await prisma.marginCategory.findUnique({
      where: { id: params.id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Margin category not found' },
        { status: 404 }
      );
    }

    // Check if name conflicts with another category (if name is being changed)
    if (name && name !== existingCategory.name) {
      const nameConflict = await prisma.marginCategory.findFirst({
        where: {
          name,
          customerType: existingCategory.customerType,
          id: { not: params.id }
        }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Category with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (marginPerKg !== undefined) updateData.marginPerKg = parseFloat(marginPerKg);
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.marginCategory.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            b2cCustomers: true,
            b2bCustomers: true
          }
        }
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating margin category:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update margin category' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/margin-categories/[id] - Deactivate margin category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.marginCategory.findUnique({
      where: { id: params.id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Margin category not found' },
        { status: 404 }
      );
    }

    // Deactivate instead of delete to preserve data integrity
    const category = await prisma.marginCategory.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    return NextResponse.json({ message: 'Category deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating margin category:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to deactivate margin category' },
      { status: 500 }
    );
  }
}
