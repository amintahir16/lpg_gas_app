import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { vendorId: { not: null } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: true
        }
      }),
      prisma.invoice.count({
        where: { vendorId: { not: null } }
      })
    ]);

    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.invoiceNumber,
      status: invoice.status,
      amount: invoice.finalAmount,
      vendor: invoice.vendor?.companyName || 'Unknown'
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Vendor invoices fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor invoices' },
      { status: 500 }
    );
  }
} 