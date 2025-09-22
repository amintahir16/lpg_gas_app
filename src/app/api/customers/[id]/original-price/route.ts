import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('productName');
    const cylinderType = searchParams.get('cylinderType');
    
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!productName || !cylinderType) {
      return NextResponse.json({ error: 'Product name and cylinder type required' }, { status: 400 });
    }

    // Find the most recent sale of this cylinder type to this customer
    const recentSale = await prisma.b2BTransaction.findFirst({
      where: {
        customerId,
        transactionType: 'SALE',
        voided: false,
        items: {
          some: {
            productName: {
              contains: productName,
              mode: 'insensitive'
            },
            cylinderType: cylinderType
          }
        }
      },
      include: {
        items: {
          where: {
            productName: {
              contains: productName,
              mode: 'insensitive'
            },
            cylinderType: cylinderType
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (recentSale && recentSale.items.length > 0) {
      const item = recentSale.items[0];
      return NextResponse.json({
        originalSoldPrice: item.pricePerItem.toNumber(),
        billSno: recentSale.billSno,
        saleDate: recentSale.date,
        found: true
      });
    }

    // If no sale found to this customer, get the last known price for this product
    const lastKnownPrice = await prisma.b2BTransactionItem.findFirst({
      where: {
        productName: {
          contains: productName,
          mode: 'insensitive'
        },
        cylinderType: cylinderType,
        transaction: {
          transactionType: 'SALE',
          voided: false
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (lastKnownPrice) {
      return NextResponse.json({
        originalSoldPrice: lastKnownPrice.pricePerItem.toNumber(),
        billSno: 'Last Known Price',
        saleDate: null,
        found: true,
        isLastKnown: true
      });
    }

    return NextResponse.json({
      found: false,
      message: 'Original sold price not found — please enter original price to compute buyback'
    });

  } catch (error) {
    console.error('Error fetching original price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch original price' },
      { status: 500 }
    );
  }
}
