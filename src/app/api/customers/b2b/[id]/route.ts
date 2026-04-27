import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

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

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
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

    // Region-scope guard: ensure the customer belongs to the active region
    const customerScopeCheck = await prisma.customer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
      select: { id: true }
    });

    if (!customerScopeCheck) {
      return NextResponse.json({ error: 'Customer not found in current region' }, { status: 404 });
    }

    // Step 1: Find all transaction IDs
    const transactions = await prisma.b2BTransaction.findMany({
      where: { customerId },
      select: { id: true }
    });

    const transactionIds = transactions.map(t => t.id);

    if (transactionIds.length > 0) {
      // Step 2: Delete transaction items
      await prisma.b2BTransactionItem.deleteMany({
        where: { transactionId: { in: transactionIds } }
      });

      // Step 3: Delete transactions
      await prisma.b2BTransaction.deleteMany({
        where: { customerId }
      });
    }

    // Step 4: Delete Customer Ledger entries
    await prisma.customerLedger.deleteMany({
      where: { customerId }
    });

    // Step 5: Delete Support Requests
    await prisma.supportRequest.deleteMany({
      where: { customerId }
    });

    // Step 5.5: Check for active assigned cylinders (Physical Only)
    // We strictly check physical records. Legacy counters are ignored.
    const customerRecord = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true }
    });

    if (!customerRecord) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check physical cylinder records (Rentals OR Location Match by ID/Name)
    const assignedCylindersCount = await prisma.cylinder.count({
      where: {
        currentStatus: 'WITH_CUSTOMER',
        OR: [
          { cylinderRentals: { some: { customerId: customerId, status: 'ACTIVE' } } },
          { location: { contains: customerId } },
          { location: { contains: customerRecord.name, mode: 'insensitive' } }
        ]
      }
    });

    if (assignedCylindersCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with cylinders due. Please return cylinders first.' },
        { status: 400 }
      );
    }

    // Step 6: Delete Cylinder Rentals
    await prisma.cylinderRental.deleteMany({
      where: { customerId }
    });

    // Step 7: Delete the customer
    const customer = await prisma.customer.delete({
      where: { id: customerId }
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