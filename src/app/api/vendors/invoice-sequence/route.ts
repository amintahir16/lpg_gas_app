import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

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

    // Create category-specific prefixes
    const categoryPrefixes: Record<string, string> = {
      'cylinder_purchase': 'CYL',
      'gas_purchase': 'GAS',
      'vaporizer_purchase': 'VAP',
      'accessories_purchase': 'ACC',
      'valves_purchase': 'VAL'
    };

    const prefix = categoryPrefixes[categorySlug as string] || 'VEN';

    // Map categorySlug to VendorCategory enum string
    const categoryEnumStr = (categorySlug as string).toUpperCase();

    const regionId = getActiveRegionId(request);

    // Get all invoice numbers for this vendor and category that start with the prefix (region-scoped)
    const purchases = await prisma.purchaseEntry.findMany({
      where: {
        vendorId: vendorId,
        category: categoryEnumStr as any,
        invoiceNumber: {
          startsWith: `${prefix}-`
        },
        ...regionScopedWhere(regionId),
      },
      select: {
        invoiceNumber: true
      },
      distinct: ['invoiceNumber']
    });

    let maxSequence = 0;
    for (const p of purchases) {
      if (p.invoiceNumber) {
        // Extract sequence part (e.g., CYL-000001 -> 1, or CYL-20260225-000001 -> 1)
        const parts = p.invoiceNumber.split('-');
        if (parts.length > 1) {
          const numPart = parts[parts.length - 1];
          const seq = parseInt(numPart, 10);
          if (!isNaN(seq) && seq > maxSequence) {
            maxSequence = seq;
          }
        }
      }
    }

    const nextSequence = maxSequence + 1;
    // Format: PREFIX-000001
    const sequenceStr = String(nextSequence).padStart(6, '0');
    const invoiceNumber = `${prefix}-${sequenceStr}`;

    return NextResponse.json({ invoiceNumber });
  } catch (error) {
    console.error('Error generating vendor invoice sequence:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice number' },
      { status: 500 }
    );
  }
}
