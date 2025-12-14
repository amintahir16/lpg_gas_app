import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InventoryIntegrationService } from '@/lib/inventory-integration';

// GET all purchases for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      console.error('❌ User not found in database:', session.user.id);
      // Try to find user by email as fallback
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email || '' }
      });
      
      if (userByEmail) {
        console.log('✅ Found user by email, updating session user ID');
        // Update the session user ID to match the database
        session.user.id = userByEmail.id;
      } else {
        console.error('❌ User not found by email either:', session.user.email);
        return NextResponse.json({ error: 'User not found in database' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      vendorId: params.id
    };

    if (startDate && endDate) {
      where.purchaseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const purchases = await prisma.vendorPurchase.findMany({
      where,
      include: {
        items: true,
        payments: true
      },
      orderBy: { purchaseDate: 'desc' }
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

// POST - Create new purchase
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      console.error('❌ User not found in database:', session.user.id);
      // Try to find user by email as fallback
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email || '' }
      });
      
      if (userByEmail) {
        console.log('✅ Found user by email, updating session user ID');
        // Update the session user ID to match the database
        session.user.id = userByEmail.id;
      } else {
        console.error('❌ User not found by email either:', session.user.email);
        return NextResponse.json({ error: 'User not found in database' }, { status: 401 });
      }
    }

    const { id } = await params;
    const body = await request.json();
    const { items, invoiceNumber, notes, purchaseDate, paidAmount } = body;

    console.log('Received purchase data:', {
      vendorId: id,
      invoiceNumber,
      itemsCount: items?.length,
      notes,
      paidAmount
    });

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Calculate total
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + Number(item.totalPrice),
      0
    );

    const paid = Number(paidAmount || 0);
    const balance = totalAmount - paid;

    let paymentStatus = 'UNPAID';
    if (paid >= totalAmount) paymentStatus = 'PAID';
    else if (paid > 0) paymentStatus = 'PARTIAL';

    // Determine individual purchase entry status
    let entryStatus = 'PENDING';
    if (paid >= totalAmount) entryStatus = 'PAID';
    else if (paid > 0) entryStatus = 'PARTIAL';

    // Create purchase with items and integrate with inventory
    console.log('Creating purchase with invoice number:', invoiceNumber);
    
    // Use database transaction to ensure both purchase and inventory updates succeed
    const purchase = await prisma.$transaction(async (tx) => {
      // Get vendor category first to determine the correct category enum
      const vendor = await tx.vendor.findUnique({
        where: { id },
        include: { category: true }
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Map vendor category slug to VendorCategory enum
      const getCategoryEnum = (slug: string | null | undefined): string => {
        if (!slug) return 'GAS_PURCHASE'; // Default fallback
        
        const slugLower = slug.toLowerCase();
        if (slugLower.includes('cylinder') || slugLower === 'cylinder_purchase') {
          return 'CYLINDER_PURCHASE';
        } else if (slugLower.includes('gas') || slugLower === 'gas_purchase') {
          return 'GAS_PURCHASE';
        } else if (slugLower.includes('vaporizer') || slugLower === 'vaporizer_purchase') {
          return 'VAPORIZER_PURCHASE';
        } else if (slugLower.includes('accessories') || slugLower === 'accessories_purchase') {
          return 'ACCESSORIES_PURCHASE';
        } else if (slugLower.includes('valve') || slugLower === 'valves_purchase') {
          return 'VALVES_PURCHASE';
        }
        return 'GAS_PURCHASE'; // Default fallback
      };

      const categoryEnum = getCategoryEnum(vendor.category?.slug);

      // Create individual purchase entries for each item
      const purchaseEntries = await Promise.all(
        items.map((item: any) =>
          tx.purchaseEntry.create({
            data: {
              vendorId: id,
              userId: session.user.id,
              category: categoryEnum as any,
              itemName: item.itemName,
              itemDescription: item.itemDescription || null,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              status: entryStatus,
              purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
              invoiceNumber,
              notes
            }
          })
        )
      );

      // Create payment if paid amount > 0
      let payment = null;
      if (paid > 0) {
        payment = await tx.vendorPayment.create({
          data: {
            vendorId: id,
            amount: paid,
            paymentDate: new Date(),
            method: 'CASH',
            status: 'COMPLETED',
            description: `Payment for invoice ${invoiceNumber}`
          }
        });
      }

      // Integrate purchased items with inventory system
      try {
        await InventoryIntegrationService.processPurchaseItems(items, vendor.category?.slug);
        console.log('✅ Inventory integration completed successfully');
      } catch (inventoryError) {
        console.error('❌ Inventory integration failed:', inventoryError);
        throw new Error(`Purchase created but inventory update failed: ${inventoryError}`);
      }

      return {
        purchaseEntries,
        payment,
        totalAmount,
        paidAmount: paid,
        balanceAmount: balance
      };
    });

    console.log('Purchase created and inventory updated successfully:', {
      purchaseEntriesCount: purchase.purchaseEntries.length,
      invoiceNumber,
      totalAmount: purchase.totalAmount
    });

    return NextResponse.json({ 
      purchase,
      message: 'Purchase created and inventory updated successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    );
  }
}

