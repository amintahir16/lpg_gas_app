import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For vendor dashboard, we need to get the vendor ID from the user
    // Since vendors don't have a direct user relationship, we'll use a different approach
    // For now, we'll return stats for all vendors (in a real app, you'd link vendors to users)
    const [totalOrders, totalInvoiced, pendingOrders, paidInvoices] = await Promise.all([
      // Total orders
      prisma.vendorOrder.count(),
      // Total invoiced amount
      prisma.vendorOrder.aggregate({
        _sum: { totalAmount: true }
      }),
      // Pending orders
      prisma.vendorOrder.count({
        where: { status: 'PENDING' }
      }),
      // Paid invoices
      prisma.invoice.count({
        where: { 
          status: 'PAID',
          vendorId: { not: null }
        }
      })
    ]);

    const stats = {
      totalOrders,
      totalInvoiced: Number(totalInvoiced._sum.totalAmount) || 0,
      pendingOrders,
      paidInvoices
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Vendor dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor dashboard stats' },
      { status: 500 }
    );
  }
} 