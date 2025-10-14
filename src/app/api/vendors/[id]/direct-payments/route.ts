import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Get all direct payments for a vendor
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        paymentDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
    }

    const payments = await prisma.vendorPayment.findMany({
      where: {
        vendorId: id,
        ...dateFilter
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching vendor payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST - Create a direct payment to vendor (not tied to specific purchase)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, paymentDate, method, reference, description } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      );
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Create direct payment
    const payment = await prisma.vendorPayment.create({
      data: {
        vendorId: id,
        amount: Number(amount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        method: method || 'CASH',
        status: 'COMPLETED',
        reference: reference || null,
        description: description || 'Direct payment to vendor'
      }
    });

    console.log('✅ Direct payment created:', {
      id: payment.id,
      vendor: vendor.name,
      amount: payment.amount
    });

    return NextResponse.json({ 
      payment,
      message: 'Payment recorded successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a direct payment (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Delete the payment
    await prisma.vendorPayment.delete({
      where: { id: paymentId }
    });

    return NextResponse.json({ 
      message: 'Payment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}

