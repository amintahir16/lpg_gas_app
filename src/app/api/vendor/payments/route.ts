import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Vendor access required' },
        { status: 401 }
      );
    }

    // Get the vendor ID
    const vendor = await prisma.vendor.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Fetch vendor orders and invoices to create payment history
    const vendorOrders = await prisma.vendorOrder.findMany({
      where: {
        vendorId: vendor.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const vendorInvoices = await prisma.invoice.findMany({
      where: {
        vendorId: vendor.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Transform orders and invoices into payment history
    const payments = [
      ...vendorOrders.map((order, index) => ({
        id: `PAY-ORDER-${order.id}`,
        date: order.createdAt.toISOString().split('T')[0],
        amount: order.totalAmount || 0,
        method: "Bank Transfer",
        status: order.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        description: `Payment for order ${order.orderNumber || order.id}`
      })),
      ...vendorInvoices.map((invoice, index) => ({
        id: `PAY-INV-${invoice.id}`,
        date: invoice.createdAt.toISOString().split('T')[0],
        amount: invoice.totalAmount || 0,
        method: "Bank Transfer",
        status: invoice.status === 'PAID' ? 'COMPLETED' : 'PENDING',
        description: `Payment for invoice ${invoice.invoiceNumber || invoice.id}`
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const completedPayments = payments.filter(payment => payment.status === "COMPLETED");
    const pendingPayments = payments.filter(payment => payment.status === "PENDING");

    return NextResponse.json({
      payments: payments.slice(0, 10), // Return only the latest 10 payments
      totalPayments,
      completedPayments: completedPayments.length,
      pendingPayments: pendingPayments.length,
      averagePayment: payments.length > 0 ? totalPayments / payments.length : 0
    });
  } catch (error) {
    console.error('Error fetching vendor payments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
} 