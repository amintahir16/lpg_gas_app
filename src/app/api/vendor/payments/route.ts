import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Fetch vendor payments from the database
    const vendorPayments = await prisma.vendorPayment.findMany({
      where: {
        vendorId: vendor.id
      },
      orderBy: {
        paymentDate: 'desc'
      },
      take: 10
    });

    // Transform vendor payments into the expected format
    const payments = vendorPayments.map((payment) => ({
      id: payment.id,
      date: payment.paymentDate.toISOString().split('T')[0],
      amount: Number(payment.amount),
      method: payment.method,
      status: payment.status,
      description: payment.description || `Payment ${payment.reference || payment.id}`,
      reference: payment.reference
    }));

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Vendor access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
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

    const { amount, paymentDate, method, description, reference } = body;

    // Create new vendor payment
    const newPayment = await prisma.vendorPayment.create({
      data: {
        vendorId: vendor.id,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        method: method,
        description,
        reference,
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      message: 'Payment created successfully',
      payment: {
        id: newPayment.id,
        date: newPayment.paymentDate.toISOString().split('T')[0],
        amount: Number(newPayment.amount),
        method: newPayment.method,
        status: newPayment.status,
        description: newPayment.description,
        reference: newPayment.reference
      }
    });
  } catch (error) {
    console.error('Error creating vendor payment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create payment' },
      { status: 500 }
    );
  }
} 