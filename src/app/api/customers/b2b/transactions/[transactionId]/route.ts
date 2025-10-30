import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const transaction = await prisma.b2BTransaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            phone: true,
            email: true,
            address: true
          }
        },
        items: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching B2B transaction details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}

