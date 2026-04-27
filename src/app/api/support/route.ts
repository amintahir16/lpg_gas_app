import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoles } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    // Any authenticated session may file a support request. The previous
    // version of this endpoint had no auth at all, so anyone on the public
    // internet could enumerate customer IDs (via FK error vs. success) and
    // flood the support queue.
    const auth = await requireRoles(['USER', 'ADMIN', 'SUPER_ADMIN', 'VENDOR']);
    if (!auth.ok) return auth.response;

    const data = await req.json();
    const { customerId, subject, description } = data;
    if (!customerId || !subject || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (
      typeof customerId !== 'string' ||
      typeof subject !== 'string' ||
      typeof description !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (subject.length > 200 || description.length > 5000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const supportRequest = await prisma.supportRequest.create({
      data: {
        customerId,
        subject,
        description,
        status: 'PENDING',
      },
    });
    return NextResponse.json(supportRequest);
  } catch (error) {
    console.error('Support request error:', error);
    return NextResponse.json({ error: 'Failed to create support request' }, { status: 500 });
  }
}
