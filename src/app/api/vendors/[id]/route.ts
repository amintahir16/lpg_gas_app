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
        inventories: {
          where: { status: 'IN_STOCK' },
          orderBy: { createdAt: 'desc' }
        },
        purchase_entries: {
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
    const totalPurchases = vendor.purchase_entries.reduce(
      (sum, p) => sum + Number(p.totalPrice), 0
    );
    
    // Calculate purchase-related payments (simplified since purchase_entries don't have payments relation)
    const totalPurchasePayments = 0; // Purchase entries don't have direct payment relations

    // Calculate direct payments
    const totalDirectPayments = vendor.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    // Total payments = purchase payments + direct payments
    const totalPaid = totalPurchasePayments + totalDirectPayments;

    // Outstanding balance = total payments - total purchases
    // Negative = vendor owes you, Positive = you owe vendor
    const outstandingBalance = totalPaid - totalPurchases;

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

export async function PUT(
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
    const { name, contactPerson, phone, email, address } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400 }
      );
    }

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id }
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update vendor
    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Vendor updated successfully',
      vendor: updatedVendor
    });

  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

