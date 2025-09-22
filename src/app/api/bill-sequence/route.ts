import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create today's sequence
    const billSequence = await prisma.billSequence.upsert({
      where: { date: today },
      update: { sequence: { increment: 1 } },
      create: { date: today, sequence: 1 },
    });

    // Format: BILL-YYYYMMDD-000000
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const sequenceStr = String(billSequence.sequence).padStart(6, '0');
    const billSno = `BILL-${dateStr}-${sequenceStr}`;

    return NextResponse.json({ billSno });
  } catch (error) {
    console.error('Error generating bill sequence:', error);
    return NextResponse.json(
      { error: 'Failed to generate bill number' },
      { status: 500 }
    );
  }
}
