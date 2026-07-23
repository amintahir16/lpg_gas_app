import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { normalizePaymentMethodKey } from '@/lib/payment-methods';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const regionId = getActiveRegionId(request);
    const { id } = await params;
    const body = await request.json();
    const { amount, description, expenseDate, paymentMethod } = body;

    const existing = await prisma.personalExpense.findFirst({
      where: { id, ...regionScopedWhere(regionId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Personal expense not found' }, { status: 404 });
    }

    const updated = await prisma.personalExpense.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
        ...(paymentMethod !== undefined && {
          paymentMethod:
            normalizePaymentMethodKey(paymentMethod) || existing.paymentMethod || 'CASH',
        }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Personal expense update error:', error);
    return NextResponse.json({ error: 'Failed to update personal expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const regionId = getActiveRegionId(request);
    const { id } = await params;

    const existing = await prisma.personalExpense.findFirst({
      where: { id, ...regionScopedWhere(regionId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Personal expense not found' }, { status: 404 });
    }

    await prisma.personalExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Personal expense delete error:', error);
    return NextResponse.json({ error: 'Failed to delete personal expense' }, { status: 500 });
  }
}
