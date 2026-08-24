import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { ActivityAction, logActivity } from '@/lib/activityLogger';

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

    const regionId = getActiveRegionId(request);
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
        ...dateFilter,
        ...regionScopedWhere(regionId),
      },
      orderBy: [
        {
          createdAt: 'desc'
        },
        {
          paymentDate: 'desc'
        }
      ]
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

    const regionId = getActiveRegionId(request);
    const { id } = await params;
    const body = await request.json();
    const { amount, paymentDate, method, reference, description, invoiceNumber } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      );
    }

    const resolvedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
    if (Number.isNaN(resolvedPaymentDate.getTime())) {
      return NextResponse.json({ error: 'Invalid payment date/time' }, { status: 400 });
    }

    // Use transaction to ensure payment and entry status updates are atomic
    const result = await prisma.$transaction(async (tx) => {
      // Verify vendor exists
      const vendor = await tx.vendor.findUnique({
        where: { id }
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Prefer batch linkage for tracked invoices; fall back to invoice text for historical entries.
      let purchaseBatchId: string | null = null;
      if (invoiceNumber) {
        const activeBatch = await tx.vendorPurchaseBatch.findFirst({
          where: {
            vendorId: id,
            invoiceNumber,
            status: 'ACTIVE',
            ...regionScopedWhere(regionId),
          },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        });
        purchaseBatchId = activeBatch?.id || null;
      }

      // Create direct payment scoped to current region.
      const payment = await tx.vendorPayment.create({
        data: {
          vendorId: id,
          amount: Number(amount),
          paymentDate: resolvedPaymentDate,
          method: method || 'CASH',
          status: 'COMPLETED',
          reference: reference || null,
          description: description || (invoiceNumber ? `Payment for invoice ${invoiceNumber}` : 'Direct payment to vendor'),
          createdBy: session.user.id,
          ...(purchaseBatchId ? { purchaseBatchId } : {}),
          ...(regionId ? { regionId } : {}),
        }
      });

      // If invoiceNumber is provided, update purchase entry statuses
      if (invoiceNumber) {
        // Find all active purchase entries with this invoice number — region-scoped.
        const purchaseEntries = await tx.purchaseEntry.findMany({
          where: {
            vendorId: id,
            invoiceNumber: invoiceNumber,
            status: { not: 'CANCELLED' },
            ...regionScopedWhere(regionId),
          }
        });

        if (purchaseEntries.length > 0) {
          // Calculate total amount for this invoice
          const invoiceTotal = purchaseEntries.reduce((sum, entry) => 
            sum + Number(entry.totalPrice), 0
          );

          // Prefer batch-linked payments; keep description fallback for historical invoices.
          const existingPayments = await tx.vendorPayment.findMany({
            where: {
              vendorId: id,
              status: 'COMPLETED',
              id: {
                not: payment.id
              },
              ...regionScopedWhere(regionId),
              OR: [
                ...(purchaseBatchId
                  ? [{ purchaseBatchId }]
                  : []),
                {
                  description: {
                    contains: invoiceNumber
                  }
                },
              ],
            }
          });

          // Calculate total paid (existing + new payment)
          const totalPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0) + Number(amount);

          // Determine new status for all entries in this invoice
          let newStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
          if (totalPaid >= invoiceTotal) {
            newStatus = 'PAID';
          } else if (totalPaid > 0) {
            newStatus = 'PARTIAL';
          }

          // Update all non-cancelled purchase entries with the new status
          await tx.purchaseEntry.updateMany({
            where: {
              vendorId: id,
              invoiceNumber: invoiceNumber,
              status: { not: 'CANCELLED' },
              ...regionScopedWhere(regionId),
            },
            data: {
              status: newStatus as any
            }
          });

          console.log(`✅ Updated ${purchaseEntries.length} purchase entries for invoice ${invoiceNumber} to status: ${newStatus}`);
        }
      } else {
        // FIFO allocation for unassigned direct payments to settle oldest pending/partial purchase entries
        let remainingPaymentToAllocate = Number(amount);
        const activeEntries = await tx.purchaseEntry.findMany({
          where: {
            vendorId: id,
            status: { in: ['PENDING', 'PARTIAL'] },
            ...regionScopedWhere(regionId),
          },
          orderBy: { purchaseDate: 'asc' },
        });

        const groupedInvoices = new Map<string, typeof activeEntries>();
        for (const entry of activeEntries) {
          const inv = entry.invoiceNumber || `entry_${entry.id}`;
          if (!groupedInvoices.has(inv)) {
            groupedInvoices.set(inv, []);
          }
          groupedInvoices.get(inv)!.push(entry);
        }

        for (const [inv, entries] of groupedInvoices) {
          if (remainingPaymentToAllocate <= 0) break;
          const invoiceTotal = entries.reduce((s, e) => s + Number(e.totalPrice), 0);
          if (remainingPaymentToAllocate >= invoiceTotal) {
            await tx.purchaseEntry.updateMany({
              where: {
                id: { in: entries.map(e => e.id) },
              },
              data: { status: 'PAID' },
            });
            remainingPaymentToAllocate -= invoiceTotal;
          } else {
            await tx.purchaseEntry.updateMany({
              where: {
                id: { in: entries.map(e => e.id) },
              },
              data: { status: 'PARTIAL' },
            });
            remainingPaymentToAllocate = 0;
          }
        }
      }

      console.log('✅ Direct payment created:', {
        id: payment.id,
        vendor: vendor.companyName,
        amount: payment.amount,
        invoiceNumber: invoiceNumber || 'N/A'
      });

      return { payment };
    });

    const vendorLabel = await prisma.vendor.findUnique({
      where: { id },
      select: { companyName: true, vendorCode: true },
    });

    await logActivity({
      userId: session.user.id,
      action: ActivityAction.VENDOR_PAYMENT_RECORDED,
      entityType: 'VENDOR_PAYMENT',
      entityId: result.payment.id,
      details: `Recorded payment of Rs ${Number(result.payment.amount).toLocaleString()} to "${vendorLabel?.companyName || 'vendor'}"${invoiceNumber ? ` • Invoice: ${invoiceNumber}` : ''} • Method: ${result.payment.method}`,
      link: `/vendors/${id}`,
      regionId,
      metadata: {
        vendorId: id,
        paymentId: result.payment.id,
        amount: Number(result.payment.amount),
        method: result.payment.method,
        invoiceNumber: invoiceNumber || null,
      },
    });

    return NextResponse.json({ 
      payment: result.payment,
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const regionId = getActiveRegionId(request);
    const existingPayment = await prisma.vendorPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        method: true,
        description: true,
        vendorId: true,
        vendor: { select: { companyName: true, vendorCode: true } },
      },
    });

    if (!existingPayment || existingPayment.vendorId !== id) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Delete the payment
    await prisma.vendorPayment.delete({
      where: { id: paymentId }
    });

    await logActivity({
      userId: session.user.id,
      action: ActivityAction.VENDOR_PAYMENT_DELETED,
      entityType: 'VENDOR_PAYMENT',
      entityId: paymentId,
      details: `Deleted payment of Rs ${Number(existingPayment.amount).toLocaleString()} for "${existingPayment.vendor.companyName}"`,
      link: `/vendors/${id}`,
      regionId,
      metadata: {
        vendorId: id,
        paymentId,
        amount: Number(existingPayment.amount),
        method: existingPayment.method,
      },
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

