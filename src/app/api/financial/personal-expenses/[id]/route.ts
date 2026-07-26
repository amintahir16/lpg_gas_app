import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { normalizePaymentMethodKey } from '@/lib/payment-methods';
import { canModifyExpense, EXPENSE_EDIT_WINDOW_MESSAGE } from '@/lib/expense-edit-window';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const session = auth.session;
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
    if (!canModifyExpense(session.user.role, existing.createdAt)) {
      return NextResponse.json({ error: EXPENSE_EDIT_WINDOW_MESSAGE }, { status: 403 });
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

    try {
      const actorName = session.user.name || session.user.email || 'A user';
      const link = `/financial/expenses`;
      const amountNum = Number(updated.amount);
      await logActivity({
        userId: session.user.id,
        action: ActivityAction.PERSONAL_EXPENSE_UPDATED,
        entityType: 'PERSONAL_EXPENSE',
        entityId: updated.id,
        details: `Updated personal expense Rs ${amountNum.toLocaleString()} • ${updated.description}`,
        link,
        regionId,
        metadata: {
          expenseId: updated.id,
          previousAmount: Number(existing.amount),
          amount: amountNum,
          description: updated.description,
        },
      });
      await notifyUserActivity({
        actorId: session.user.id,
        actorName,
        title: 'Personal expense updated',
        message: `${actorName} updated Rs ${amountNum.toLocaleString()} personal expense • ${updated.description}.`,
        link,
        priority: 'MEDIUM',
        regionId,
        metadata: {
          domain: 'PERSONAL_EXPENSE',
          expenseId: updated.id,
          amount: amountNum,
        },
      });
    } catch (sideEffectError) {
      console.error('Personal expense update side effects failed:', sideEffectError);
    }

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
    if (!canModifyExpense(auth.session.user.role, existing.createdAt)) {
      return NextResponse.json({ error: EXPENSE_EDIT_WINDOW_MESSAGE }, { status: 403 });
    }

    await prisma.personalExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Personal expense delete error:', error);
    return NextResponse.json({ error: 'Failed to delete personal expense' }, { status: 500 });
  }
}
