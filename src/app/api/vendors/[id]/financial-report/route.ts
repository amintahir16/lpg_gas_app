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
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // all, daily, monthly, yearly
    const date = searchParams.get('date') || new Date().toISOString();

    let startDate: Date;
    let endDate: Date = new Date(date);

    // Calculate date range based on period
    switch (period) {
      case 'daily':
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(date);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(date);
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        // All time
        startDate = new Date('2000-01-01');
        endDate = new Date();
    }

    // Get purchases in date range
    const purchases = await prisma.vendorPurchase.findMany({
      where: {
        vendorId: id,
        purchaseDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        items: true,
        payments: {
          where: {
            paymentDate: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      }
    });

    // Calculate financial metrics
    const totalPurchases = purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0
    );

    const totalPayments = purchases.reduce(
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

    const outstandingBalance = purchases.reduce(
      (sum, p) => sum + Number(p.balanceAmount),
      0
    );

    // Get overall balance (all time)
    const allPurchases = await prisma.vendorPurchase.findMany({
      where: { vendorId: id },
      select: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        payments: {
          select: { amount: true }
        }
      }
    });

    const overallBalance = allPurchases.reduce(
      (sum, p) => {
        // Use balanceAmount if available, otherwise calculate it
        if (Number(p.balanceAmount) !== 0) {
          return sum + Number(p.balanceAmount);
        } else {
          // Calculate: totalAmount - paidAmount
          return sum + (Number(p.totalAmount) - Number(p.paidAmount));
        }
      },
      0
    );

    const report = {
      period,
      startDate,
      endDate,
      cashOut: totalPurchases, // Money going out (purchases)
      cashIn: totalPayments,   // Money coming in (payments made)
      netBalance: overallBalance,
      periodBalance: totalPurchases - totalPayments,
      totalPurchases,
      totalPayments,
      outstandingBalance,
      purchaseCount: purchases.length
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating financial report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

