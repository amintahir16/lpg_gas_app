import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma, VendorCategory, PurchaseEntryStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseEntryWhereInput = {
      ...(vendorId && { vendorId }),
      ...(category && { category: category.toUpperCase().replace('-', '_') as VendorCategory }),
      ...(status && { status: status.toUpperCase() as PurchaseEntryStatus })
    };

    const [purchases, total] = await Promise.all([
      prisma.purchaseEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              vendorCode: true,
              companyName: true,
              category: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.purchaseEntry.count({ where })
    ]);

    return NextResponse.json({
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Purchase entries fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      vendorId,
      category,
      itemName,
      itemDescription,
      quantity,
      unitPrice,
      totalPrice,
      purchaseDate,
      invoiceNumber,
      notes
    } = body;

    // Validate category
    const validCategory = category.toUpperCase().replace('-', '_') as VendorCategory;
    if (!Object.values(VendorCategory).includes(validCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const purchase = await prisma.purchaseEntry.create({
      data: {
        vendorId,
        category: validCategory,
        itemName,
        itemDescription,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        totalPrice: parseFloat(totalPrice),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        invoiceNumber,
        notes,
        userId: session.user.id
      },
      include: {
        vendor: {
          select: {
            id: true,
            vendorCode: true,
            companyName: true,
            category: true
          }
        }
      }
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error('Purchase entry creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase entry' },
      { status: 500 }
    );
  }
}
