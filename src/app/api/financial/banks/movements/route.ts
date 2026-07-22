import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import {
  formatPaymentMethodLabel,
  isSelectablePaymentMethod,
  normalizePaymentMethodKey,
} from '@/lib/payment-methods';
import { resolveFinancialPeriod, combineLocalDateAndTime } from '@/lib/financial-period';
import { userDisplayName } from '@/lib/bank-ledger';

type MovementType = 'DEPOSIT' | 'TRANSFER';

function parseMovementDate(value: unknown, time?: unknown): Date {
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    // date-only YYYY-MM-DD (+ optional HH:MM) → local datetime
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnly) {
      const timeStr =
        typeof time === 'string' && time.trim() ? time.trim() : undefined;
      return combineLocalDateAndTime(trimmed, timeStr);
    }
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);
    const { searchParams } = new URL(request.url);
    const resolved = resolveFinancialPeriod({
      period: searchParams.get('period'),
      date: searchParams.get('date'),
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });

    const movements = await prisma.bankMovement.findMany({
      where: {
        movementDate: { gte: resolved.startDate, lte: resolved.endDate },
        ...regionScope,
      },
      include: {
        createdByUser: {
          select: { name: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        fromMethod: m.fromMethod,
        toMethod: m.toMethod,
        amount: Number(m.amount),
        movementDate: m.movementDate,
        notes: m.notes,
        createdBy: m.createdBy,
        recordedBy: userDisplayName(m.createdByUser),
        createdAt: m.createdAt,
      })),
      label: resolved.label,
      period: resolved.period,
    });
  } catch (error) {
    console.error('Bank movements GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bank movements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const typeRaw = String(body.type || '').toUpperCase() as MovementType;
    const amount = Number(body.amount);
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
    const movementDate = parseMovementDate(body.date || body.movementDate, body.time);

    if (typeRaw !== 'DEPOSIT' && typeRaw !== 'TRANSFER') {
      return NextResponse.json(
        { error: 'type must be DEPOSIT or TRANSFER' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    const toMethod = normalizePaymentMethodKey(body.toMethod);
    if (!toMethod || !isSelectablePaymentMethod(toMethod)) {
      return NextResponse.json({ error: 'Invalid destination bank' }, { status: 400 });
    }

    let fromMethod: string | null = null;
    if (typeRaw === 'TRANSFER') {
      fromMethod = normalizePaymentMethodKey(body.fromMethod);
      if (!fromMethod || !isSelectablePaymentMethod(fromMethod)) {
        return NextResponse.json({ error: 'Invalid source bank' }, { status: 400 });
      }
      if (fromMethod === toMethod) {
        return NextResponse.json(
          { error: 'Source and destination banks must be different' },
          { status: 400 }
        );
      }
    }

    const movement = await prisma.bankMovement.create({
      data: {
        type: typeRaw,
        fromMethod,
        toMethod,
        amount,
        movementDate,
        notes,
        createdBy: auth.session.user.id,
        ...(regionId ? { regionId } : {}),
      },
      include: {
        createdByUser: {
          select: { name: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(
      {
        movement: {
          id: movement.id,
          type: movement.type,
          fromMethod: movement.fromMethod,
          toMethod: movement.toMethod,
          amount: Number(movement.amount),
          movementDate: movement.movementDate,
          notes: movement.notes,
          recordedBy: userDisplayName(movement.createdByUser),
          message:
            typeRaw === 'DEPOSIT'
              ? `Deposited to ${formatPaymentMethodLabel(toMethod)}`
              : `Moved from ${formatPaymentMethodLabel(fromMethod)} to ${formatPaymentMethodLabel(toMethod)}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bank movements POST error:', error);
    return NextResponse.json({ error: 'Failed to save bank movement' }, { status: 500 });
  }
}
