import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = {
      isActive: true,
      OR: search ? [
        { companyName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { contactPerson: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { vendorCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      ] : undefined
    };

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vendor.count({ where })
    ]);

    return NextResponse.json({
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Vendors fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      taxId,
      paymentTerms
    } = body;

    // Generate unique vendor code
    const vendorCount = await prisma.vendor.count();
    const vendorCode = `VEND${String(vendorCount + 1).padStart(3, '0')}`;

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode,
        companyName,
        contactPerson,
        email,
        phone,
        address,
        taxId,
        paymentTerms: parseInt(paymentTerms) || 30,
        isActive: true
      }
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Vendor creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
} 