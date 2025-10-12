import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId, categorySlug } = await request.json();

    if (!vendorId || !categorySlug) {
      return NextResponse.json(
        { error: 'Vendor ID and category are required' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create category-specific prefixes
    const categoryPrefixes = {
      'cylinder_purchase': 'CYL',
      'gas_purchase': 'GAS',
      'vaporizer_purchase': 'VAP',
      'accessories_purchase': 'ACC',
      'valves_purchase': 'VAL'
    };

    const prefix = categoryPrefixes[categorySlug as keyof typeof categoryPrefixes] || 'VEN';

    // Get or create today's sequence for this vendor category
    const sequenceKey = `${prefix}_${today.toISOString().slice(0, 10)}`;
    
    // Use BillSequence table but with category-specific keys
    const billSequence = await prisma.billSequence.upsert({
      where: { date: today },
      update: { sequence: { increment: 1 } },
      create: { date: today, sequence: 1 },
    });

    // Format: PREFIX-YYYYMMDD-000000
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const sequenceStr = String(billSequence.sequence).padStart(6, '0');
    const invoiceNumber = `${prefix}-${dateStr}-${sequenceStr}`;

    return NextResponse.json({ invoiceNumber });
  } catch (error) {
    console.error('Error generating vendor invoice sequence:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice number' },
      { status: 500 }
    );
  }
}
