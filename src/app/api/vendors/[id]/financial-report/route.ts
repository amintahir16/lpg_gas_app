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
    const purchases = await prisma.purchaseEntry.findMany({
      where: {
        vendorId: id,
        purchaseDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get direct vendor payments in date range
    const directPayments = await prisma.vendorPayment.findMany({
      where: {
        vendorId: id,
        paymentDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      }
    });

    // Calculate financial metrics
    const totalPurchases = purchases.reduce(
      (sum, p) => sum + Number(p.totalPrice),
      0
    );

    // For PurchaseEntry model, we need to get payments from VendorPayment model
    // that are linked to these purchase entries via invoice numbers or other means
    const purchasePayments = 0; // Will be calculated from VendorPayment records

    // Calculate direct payments
    const directPaymentsTotal = directPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    // Total payments = purchase payments + direct payments
    const totalPayments = purchasePayments + directPaymentsTotal;

    // Calculate period outstanding balance (period purchases - period payments)
    const periodOutstandingBalance = totalPurchases - totalPayments;

    // Get overall balance (all time)
    const allPurchases = await prisma.purchaseEntry.findMany({
      where: { vendorId: id },
      select: {
        totalPrice: true
      }
    });

    // Get all direct payments (all time)
    const allDirectPayments = await prisma.vendorPayment.findMany({
      where: { 
        vendorId: id,
        status: 'COMPLETED'
      },
      select: { amount: true }
    });

    // Calculate total purchases (all time)
    const allTimeTotalPurchases = allPurchases.reduce(
      (sum, p) => sum + Number(p.totalPrice),
      0
    );

    // Calculate all purchase-related payments (from VendorPayment records)
    const allPurchasePayments = 0; // Will be calculated from VendorPayment records

    // Calculate all direct payments
    const allTimeDirectPayments = allDirectPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    // Overall balance = total purchases - (purchase payments + direct payments)
    const overallBalance = allTimeTotalPurchases - (allPurchasePayments + allTimeDirectPayments);

    const report = {
      period,
      startDate,
      endDate,
      cashOut: totalPurchases, // Money going out (purchases)
      cashIn: totalPayments,   // Money coming in (payments made)
      netBalance: overallBalance,
      periodBalance: periodOutstandingBalance,
      totalPurchases,
      totalPayments,
      purchasePayments: purchasePayments,
      directPayments: directPaymentsTotal,
      outstandingBalance: overallBalance, // Use overall balance for outstanding
      purchaseCount: purchases.length,
      directPaymentCount: directPayments.length
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

