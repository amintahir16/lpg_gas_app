import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/apiAuth';

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const count = await prisma.websiteInquiry.count({
      where: { status: 'NEW' },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Website inquiries count error:', error);
    return NextResponse.json({ error: 'Failed to fetch inquiry count' }, { status: 500 });
  }
}
