import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, clampLimit } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (type === 'CONTACT' || type === 'SHOP_ORDER') where.type = type;
    if (status === 'NEW' || status === 'IN_PROGRESS' || status === 'RESOLVED' || status === 'CLOSED') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [inquiries, total, newCount] = await Promise.all([
      prisma.websiteInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.websiteInquiry.count({ where }),
      prisma.websiteInquiry.count({ where: { status: 'NEW' } }),
    ]);

    return NextResponse.json({
      inquiries,
      summary: { newCount },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Website inquiries fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
  }
}
