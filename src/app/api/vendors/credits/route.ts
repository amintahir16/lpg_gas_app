import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Get all vendor credit balances
export async function GET(request: NextRequest) {
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

    // Get all vendors with their purchase data
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        purchases: {
          select: {
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            payments: {
              select: { amount: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate credit balances for each vendor
    const vendorCredits = vendors.map(vendor => {
      const totalPurchases = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.totalAmount), 0
      );
      
      const totalPaidAmount = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.paidAmount), 0
      );
      
      const totalSeparatePayments = vendor.purchases.reduce(
        (sum, p) => sum + p.payments.reduce(
          (pSum, pay) => pSum + Number(pay.amount), 0
        ), 0
      );

      // Use paidAmount if no separate payments, otherwise use separate payments
      const actualPayments = totalSeparatePayments > 0 ? totalSeparatePayments : totalPaidAmount;
      
      // Credit balance = Payments made - Total purchases (negative = credit)
      const creditBalance = actualPayments - totalPurchases;
      
      return {
        id: vendor.id,
        name: vendor.name,
        phone: vendor.phone,
        address: vendor.address,
        totalPurchases,
        totalPayments: actualPayments,
        creditBalance, // Negative = credit (vendor owes you), Positive = outstanding (you owe vendor)
        outstandingBalance: -creditBalance, // Inverted for display
        purchaseCount: vendor.purchases.length,
        hasCredit: creditBalance > 0,
        hasOutstanding: creditBalance < 0
      };
    });

    // Calculate totals
    const totalCredits = vendorCredits
      .filter(v => v.hasCredit)
      .reduce((sum, v) => sum + v.creditBalance, 0);
    
    const totalOutstanding = vendorCredits
      .filter(v => v.hasOutstanding)
      .reduce((sum, v) => sum + Math.abs(v.outstandingBalance), 0);

    return NextResponse.json({
      vendors: vendorCredits,
      summary: {
        totalVendors: vendorCredits.length,
        vendorsWithCredits: vendorCredits.filter(v => v.hasCredit).length,
        vendorsWithOutstanding: vendorCredits.filter(v => v.hasOutstanding).length,
        totalCreditBalance: totalCredits,
        totalOutstandingBalance: totalOutstanding,
        netPosition: totalCredits - totalOutstanding
      }
    });

  } catch (error) {
    console.error('Error fetching vendor credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor credits' },
      { status: 500 }
    );
  }
}

// POST - Apply credit to a purchase
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vendorId, purchaseId, creditAmount, notes } = body;

    if (!vendorId || !purchaseId || !creditAmount) {
      return NextResponse.json(
        { error: 'Vendor ID, Purchase ID, and credit amount are required' },
        { status: 400 }
      );
    }

    // Verify vendor has sufficient credit
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        purchases: {
          select: {
            totalAmount: true,
            paidAmount: true,
            payments: { select: { amount: true } }
          }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Calculate current credit balance
    const totalPurchases = vendor.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const totalPaidAmount = vendor.purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const currentCredit = totalPaidAmount - totalPurchases;

    if (currentCredit < creditAmount) {
      return NextResponse.json(
        { error: 'Insufficient credit balance' },
        { status: 400 }
      );
    }

    // Create credit application record (you might want to add this to your schema)
    // For now, we'll create a payment record with negative amount to represent credit usage
    const creditApplication = await prisma.vendorPurchasePayment.create({
      data: {
        purchaseId,
        amount: -creditAmount, // Negative amount represents credit usage
        paymentDate: new Date(),
        paymentMethod: 'CREDIT_APPLICATION',
        reference: `CREDIT-${Date.now()}`,
        notes: notes || `Credit application of Rs ${creditAmount.toLocaleString()}`
      }
    });

    return NextResponse.json({ 
      success: true, 
      creditApplication,
      remainingCredit: currentCredit - creditAmount
    });

  } catch (error) {
    console.error('Error applying credit:', error);
    return NextResponse.json(
      { error: 'Failed to apply credit' },
      { status: 500 }
    );
  }
}
