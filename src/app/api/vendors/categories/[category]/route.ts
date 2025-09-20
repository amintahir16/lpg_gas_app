import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma, VendorCategory } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category } = params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Validate category
    const validCategory = category.toUpperCase().replace('-', '_') as VendorCategory;
    if (!Object.values(VendorCategory).includes(validCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const where: Prisma.VendorWhereInput = {
      isActive: true,
      category: validCategory,
      OR: search ? [
        { companyName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { contactPerson: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { vendorCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      ] : undefined
    };

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          purchaseEntries: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          financialReports: {
            take: 1,
            orderBy: { reportDate: 'desc' }
          }
        }
      }),
      prisma.vendor.count({ where })
    ]);

    return NextResponse.json({
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Category vendors fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category vendors' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category } = params;
    const validCategory = category.toUpperCase().replace('-', '_') as VendorCategory;
    
    if (!Object.values(VendorCategory).includes(validCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const body = await request.json();
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      taxId,
      paymentTerms
    } = body;

    // Generate unique vendor code
    const vendorCount = await prisma.vendor.count();
    const vendorCode = `${validCategory.slice(0, 3).toUpperCase()}${String(vendorCount + 1).padStart(3, '0')}`;

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode,
        companyName,
        contactPerson,
        email,
        phone,
        address,
        taxId,
        category: validCategory,
        paymentTerms: parseInt(paymentTerms) || 30,
        isActive: true
      }
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Category vendor creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create category vendor' },
      { status: 500 }
    );
  }
}
