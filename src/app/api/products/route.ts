import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ProductCategory, StockType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const stockType = searchParams.get('stockType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isActive: true,
    };

    if (category) {
      whereClause.category = category as ProductCategory;
    }

    if (stockType) {
      whereClause.stockType = stockType as StockType;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      category,
      unit,
      stockQuantity,
      stockType,
      remainingKg,
      priceSoldToCustomer,
      lowStockThreshold,
    } = body;

    const product = await prisma.product.create({
      data: {
        name,
        category: category as ProductCategory,
        unit,
        stockQuantity: parseFloat(stockQuantity) || 0,
        stockType: stockType as StockType || 'FILLED',
        remainingKg: remainingKg ? parseFloat(remainingKg) : null,
        priceSoldToCustomer: parseFloat(priceSoldToCustomer),
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
