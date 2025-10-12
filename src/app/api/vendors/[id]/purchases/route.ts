import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Create purchase with items
    console.log('Creating purchase with invoice number:', invoiceNumber);
    
    const purchase = await prisma.vendorPurchase.create({
      data: {
        vendorId: id,
        userId: session.user.id,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        invoiceNumber,
        notes,
        totalAmount,
        paidAmount: paid,
        balanceAmount: balance,
        paymentStatus,
        items: {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            vendorItemId: item.vendorItemId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            cylinderCodes: item.cylinderCodes || null
          }))
        },
        ...(paid > 0 && {
          payments: {
            create: {
              amount: paid,
              paymentDate: new Date(),
              paymentMethod: 'CASH'
            }
          }
        })
      },
      include: {
        items: true,
        payments: true
      }
    });

    console.log('Purchase created successfully:', {
      id: purchase.id,
      invoiceNumber: purchase.invoiceNumber,
      totalAmount: purchase.totalAmount
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    );
  }
}

