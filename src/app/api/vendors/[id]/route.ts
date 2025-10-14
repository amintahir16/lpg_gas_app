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
        },
        payments: {
          where: {
            status: 'COMPLETED'
          }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Calculate purchase-related totals
    const totalPurchases = vendor.purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount), 0
    );
    
    // Calculate purchase-related payments
    const totalPurchasePayments = vendor.purchases.reduce(
      (sum, p) => {
        // Check if there are separate payment records (newer system)
        const separatePayments = p.payments.reduce(
          (pSum, payment) => pSum + Number(payment.amount),
          0
        );
        
        // If there are separate payment records, use them; otherwise use paidAmount
        if (separatePayments > 0) {
          return sum + separatePayments;
        } else {
          return sum + Number(p.paidAmount);
        }
      },
      0
    );

    // Calculate direct payments
    const totalDirectPayments = vendor.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    // Total payments = purchase payments + direct payments
    const totalPaid = totalPurchasePayments + totalDirectPayments;

    // Outstanding balance = total purchases - total payments
    const outstandingBalance = totalPurchases - totalPaid;

    return NextResponse.json({
      vendor: {
        ...vendor,
        financialSummary: {
          totalPurchases,
          totalPaid,
          outstandingBalance,
          cashIn: totalPaid,
          cashOut: totalPurchases,
          netBalance: outstandingBalance,
          purchasePayments: totalPurchasePayments,
          directPayments: totalDirectPayments
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

