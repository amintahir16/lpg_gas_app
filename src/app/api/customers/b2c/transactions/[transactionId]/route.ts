import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await params;

    const transaction = await prisma.b2CTransaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
            houseNumber: true,
            sector: true,
            street: true,
            phase: true,
            area: true,
            city: true,
            phone: true
          }
        },
        gasItems: true,
        securityItems: true,
        accessoryItems: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);

  } catch (error) {
    console.error('Error fetching B2C transaction details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}
