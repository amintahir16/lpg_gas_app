import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        category: true,
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        purchases: {
          include: {
            items: true,
            payments: true
          },
          orderBy: { purchaseDate: 'desc' }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Calculate financial summary
    const totalPurchases = vendor.purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount), 0
    );
    const totalPaid = vendor.purchases.reduce(
      (sum, p) => sum + Number(p.paidAmount), 0
    );
    const outstandingBalance = vendor.purchases.reduce(
      (sum, p) => sum + Number(p.balanceAmount), 0
    );

    return NextResponse.json({
      vendor: {
        ...vendor,
        financialSummary: {
          totalPurchases,
          totalPaid,
          outstandingBalance,
          cashIn: totalPaid,
          cashOut: totalPurchases,
          netBalance: outstandingBalance
        }
      }
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

