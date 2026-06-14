import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { sanitizeWebsiteField } from '@/lib/website-inquiry';

const VALID_STATUSES = new Set(['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const inquiry = await prisma.websiteInquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }
    return NextResponse.json(inquiry);
  } catch (error) {
    console.error('Website inquiry fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch inquiry' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const data: { status?: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; adminNotes?: string | null } = {};

    if (typeof body.status === 'string' && VALID_STATUSES.has(body.status)) {
      data.status = body.status as 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    }
    if (body.adminNotes !== undefined) {
      const notes = sanitizeWebsiteField(body.adminNotes, 2000);
      data.adminNotes = notes || null;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const inquiry = await prisma.websiteInquiry.update({
      where: { id },
      data,
    });
    return NextResponse.json(inquiry);
  } catch (error) {
    console.error('Website inquiry update error:', error);
    return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 });
  }
}
