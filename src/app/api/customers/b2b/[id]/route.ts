import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';
import { adoptLegacyB2bCustomerIfNeeded, getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id: customerId } = await params;

    await adoptLegacyB2bCustomerIfNeeded(customerId, regionId);

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, type: 'B2B', ...regionScopedWhere(regionId) },
      include: { marginCategory: true }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching B2B customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
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

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id: customerId } = await params;

    await adoptLegacyB2bCustomerIfNeeded(customerId, regionId);

    const body = await request.json();
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      creditLimit,
      paymentTermsDays,
      notes,
      isActive,
      customerType,
      marginCategoryId
    } = body;

    // Validate required fields only if they are being updated
    if (name !== undefined && (!name || !contactPerson || !phone)) {
      return NextResponse.json(
        { error: 'Name, contact person, and phone are required' },
        { status: 400 }
      );
    }

    // Check if another customer with same phone already exists (only if phone is being updated)
    if (phone) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          phone,
          id: { not: customerId },
          ...regionScopedWhere(regionId),
        }
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Another customer with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address || null;
    if (creditLimit !== undefined) updateData.creditLimit = creditLimit ? parseFloat(creditLimit) : 0;
    if (paymentTermsDays !== undefined) updateData.paymentTermsDays = paymentTermsDays ? parseInt(paymentTermsDays) : 30;
    if (notes !== undefined || customerType !== undefined) {
      // If either notes or customerType changes, we need to reconstruct the full notes
      const currentNotes = notes !== undefined ? notes : ""; // This might need carefully handling if we want to preserve existing notes when only type changes. 
      // Actually, simplified approach: we expect the frontend to send both or we handle the reconstruction here.
      // Let's assume frontend sends the "clean" notes (without prefix) in `body.notes`. 
      // But we also need to handle if ONLY one of them is updated?
      // The safest bet based on the plan is that the API receives the "new state" for these.

      // However, we should check if they are provided. 
      // If `notes` is provided, use it. If not provided, we might lose it if we just use ""? 
      // The update logic in the plan implies we simply reconstruct.
      // Let's fetch the existing customer if we need to merge, BUT the `update` below doesn't fetch first.
      // Wait, we can't easily merge without fetching first if they are optional.
      // But our `handleUpdateCustomer` in frontend sends ALL fields from the form.
      // So `notes` and `customerType` will be present in the body.

      const combinedNotes = customerType ?
        `Customer Type: ${customerType}${notes ? ` | ${notes}` : ''}` :
        notes;

      updateData.notes = combinedNotes || null;
    }

    if (isActive !== undefined) updateData.isActive = isActive;
    if (marginCategoryId !== undefined) updateData.marginCategoryId = marginCategoryId || null;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      include: { marginCategory: true }
    });

    try {
      const changedFields = Object.keys(updateData);
      const link = `/customers/b2b/${customer.id}`;
      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2B_CUSTOMER_UPDATED,
        entityType: 'B2B_CUSTOMER',
        entityId: customer.id,
        details: `Updated B2B customer "${customer.name}"${changedFields.length ? ` • Fields: ${changedFields.join(', ')}` : ''}`,
        link,
        regionId,
        metadata: {
          customerId: customer.id,
          customerName: customer.name,
          changedFields,
        },
      });
      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: 'B2B customer updated',
        message: `${session.user.name || session.user.email} updated B2B customer "${customer.name}".`,
        link,
        priority: 'LOW',
        regionId,
        metadata: {
          domain: 'B2B_CUSTOMER',
          customerId: customer.id,
          customerName: customer.name,
          changedFields,
        },
      });
    } catch (sideEffectError) {
      console.error('B2B customer update side effects failed:', sideEffectError);
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating B2B customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id: customerId } = await params;

    await adoptLegacyB2bCustomerIfNeeded(customerId, regionId);

    // Region-scope guard: ensure the customer belongs to the active region
    const customerRecord = await prisma.customer.findFirst({
      where: { id: customerId, type: 'B2B', ...regionScopedWhere(regionId) },
      select: { id: true, name: true, isActive: true, ledgerBalance: true }
    });

    if (!customerRecord) {
      return NextResponse.json({ error: 'Customer not found in current region' }, { status: 404 });
    }

    // ----------------------------------------------------------------------
    // PRE-DELETE GUARDS — run BEFORE touching any data.
    // A B2B customer may only be deleted when their account is fully closed:
    //   1) Net balance is settled (ledgerBalance == 0), and
    //   2) No cylinders are still physically held by the customer.
    // If either fails we return WITHOUT deleting anything, so transactions,
    // ledger, balances and profit history are never lost.
    // ----------------------------------------------------------------------
    const ledgerBalance = Number(customerRecord.ledgerBalance);
    // Settled = rounds to Rs 0. Sub-rupee residue (e.g. from buyback percentage
    // math) is ignored so it matches the whole-rupee balance shown in the UI and
    // can't permanently block deletion when payments are made in whole rupees.
    const hasOutstandingBalance = Math.abs(ledgerBalance) >= 0.5;

    // Physical cylinder holdings (Rentals OR location match by ID/Name), region-scoped
    const assignedCylindersCount = await prisma.cylinder.count({
      where: {
        currentStatus: 'WITH_CUSTOMER',
        ...regionScopedWhere(regionId),
        OR: [
          { cylinderRentals: { some: { customerId: customerId, status: 'ACTIVE' } } },
          { location: { contains: customerId } },
          { location: { contains: customerRecord.name, mode: 'insensitive' } }
        ]
      }
    });
    const hasCylinderHoldings = assignedCylindersCount > 0;

    if (hasOutstandingBalance || hasCylinderHoldings) {
      const reasons: string[] = [];
      if (hasOutstandingBalance) {
        const owes = ledgerBalance > 0;
        const amountText = `Rs ${Math.round(Math.abs(ledgerBalance)).toLocaleString('en-PK')}`;
        reasons.push(
          owes
            ? `an unsettled balance (customer owes you ${amountText})`
            : `an unsettled balance (customer has ${amountText} credit)`,
        );
      }
      if (hasCylinderHoldings) {
        reasons.push(`${assignedCylindersCount} cylinder${assignedCylindersCount === 1 ? '' : 's'} still held`);
      }
      return NextResponse.json(
        {
          error: `Cannot delete "${customerRecord.name}" — customer has ${reasons.join(' and ')}. Settle the balance to zero and collect all cylinders before deleting.`,
          code: 'CUSTOMER_NOT_SETTLED',
          hasOutstandingBalance,
          hasCylinderHoldings,
          cylindersHeld: assignedCylindersCount,
          ledgerBalance,
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------------------
    // All guards passed — delete atomically so a partial failure never leaves
    // orphaned/half-deleted data behind.
    // ----------------------------------------------------------------------
    const customer = await prisma.$transaction(async (tx) => {
      const transactions = await tx.b2BTransaction.findMany({
        where: { customerId },
        select: { id: true },
      });
      const transactionIds = transactions.map(t => t.id);

      if (transactionIds.length > 0) {
        await tx.b2BTransactionItem.deleteMany({ where: { transactionId: { in: transactionIds } } });
        await tx.b2BTransaction.deleteMany({ where: { customerId } });
      }

      await tx.customerLedger.deleteMany({ where: { customerId } });
      await tx.supportRequest.deleteMany({ where: { customerId } });
      await tx.cylinderRental.deleteMany({ where: { customerId } });

      return tx.customer.delete({ where: { id: customerId } });
    });

    try {
      await logActivity({
        userId: session.user.id,
        action: ActivityAction.B2B_CUSTOMER_DELETED,
        entityType: 'B2B_CUSTOMER',
        entityId: customer.id,
        details: `Deleted B2B customer "${customer.name}"`,
        link: '/customers/b2b',
        regionId,
        metadata: {
          customerId: customer.id,
          customerName: customer.name,
        },
      });
      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: 'B2B customer deleted',
        message: `${session.user.name || session.user.email} deleted B2B customer "${customer.name}".`,
        link: '/customers/b2b',
        priority: 'HIGH',
        regionId,
        metadata: {
          domain: 'B2B_CUSTOMER',
          customerId: customer.id,
          customerName: customer.name,
        },
      });
    } catch (sideEffectError) {
      console.error('B2B customer delete side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      message: 'Customer deleted successfully',
      customer: {
        id: customer.id,
        name: customer.name,
        isActive: customer.isActive
      }
    });

  } catch (error) {
    console.error('Error deleting B2B customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}