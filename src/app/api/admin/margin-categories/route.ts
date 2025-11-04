import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureDefaultCategoriesExist } from '@/lib/margin-categories';

// GET /api/admin/margin-categories - Get all margin categories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerType = searchParams.get('customerType') as 'B2C' | 'B2B' | null;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Auto-initialize categories if they don't exist (safety net)
    // This ensures categories are always available, even in new deployments
    await ensureDefaultCategoriesExist(customerType || undefined);

    const where: any = {};
    if (customerType) where.customerType = customerType;
    if (activeOnly) where.isActive = true;

    const categories = await prisma.marginCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            b2cCustomers: true,
            b2bCustomers: true
          }
        }
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching margin categories:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch margin categories' },
      { status: 500 }
    );
  }
}

// POST /api/admin/margin-categories - Create new margin category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, customerType, marginPerKg, description, sortOrder } = body;

    // Validate required fields
    if (!name || !customerType || marginPerKg === undefined) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Name, customer type, and margin per kg are required' },
        { status: 400 }
      );
    }

    // Check if category with same name and type already exists
    const existingCategory = await prisma.marginCategory.findFirst({
      where: {
        name,
        customerType
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Category with this name and customer type already exists' },
        { status: 409 }
      );
    }

    const category = await prisma.marginCategory.create({
      data: {
        name,
        customerType,
        marginPerKg: parseFloat(marginPerKg),
        description: description || null,
        sortOrder: sortOrder || 0
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating margin category:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create margin category' },
      { status: 500 }
    );
  }
}
