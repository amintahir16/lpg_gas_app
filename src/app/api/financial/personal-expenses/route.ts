import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin, clampLimit } from '@/lib/apiAuth';
import { normalizePaymentMethodKey } from '@/lib/payment-methods';
import {
  getFinancialChartBuckets,
  resolveFinancialPeriod,
} from '@/lib/financial-period';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 100);
    const skip = (page - 1) * limit;

    const resolved = resolveFinancialPeriod({
      period: searchParams.get('period'),
      date: searchParams.get('date'),
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });
    const { startDate, endDate, period, month, year, date, label } = resolved;

    const where = {
      ...regionScope,
      expenseDate: { gte: startDate, lte: endDate },
    };

    const [expenses, total, periodAgg] = await Promise.all([
      prisma.personalExpense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.personalExpense.count({ where }),
      prisma.personalExpense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    const chartBuckets = getFinancialChartBuckets(resolved);
    const chartData = [];
    for (const bucket of chartBuckets) {
      const bucketTotal = await prisma.personalExpense.aggregate({
        where: {
          expenseDate: { gte: bucket.startDate, lte: bucket.endDate },
          ...regionScope,
        },
        _sum: { amount: true },
      });
      chartData.push({
        name: bucket.name,
        personal: Number(bucketTotal._sum.amount || 0),
      });
    }

    return NextResponse.json({
      expenses,
      chartData,
      summary: {
        totalPersonal: Number(periodAgg._sum.amount || 0),
        count: total,
      },
      period,
      date,
      month,
      year,
      label,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Personal expenses fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch personal expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const { amount, description, expenseDate, paymentMethod } = body;

    if (!amount || !description || !expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, expenseDate' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const methodKey = normalizePaymentMethodKey(paymentMethod) || 'CASH';

    const expense = await prisma.personalExpense.create({
      data: {
        amount: parsedAmount,
        description: String(description).trim(),
        expenseDate: new Date(expenseDate),
        paymentMethod: methodKey,
        createdBy: session.user.id,
        ...(regionId ? { regionId } : {}),
      },
    });

    try {
      const link = `/financial/expenses`;
      await logActivity({
        userId: session.user.id,
        action: ActivityAction.PERSONAL_EXPENSE_CREATED,
        entityType: 'PERSONAL_EXPENSE',
        entityId: expense.id,
        details: `Recorded personal expense Rs ${parsedAmount.toLocaleString()} • ${description}`,
        link,
        regionId,
        metadata: {
          expenseId: expense.id,
          amount: parsedAmount,
          paymentMethod: methodKey,
          description,
        },
      });
      await notifyUserActivity({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'A user',
        title: 'Personal expense recorded',
        message: `${session.user.name || session.user.email} recorded Rs ${parsedAmount.toLocaleString()} personal expense • ${description}.`,
        link,
        priority: 'LOW',
        regionId,
        metadata: {
          domain: 'PERSONAL_EXPENSE',
          expenseId: expense.id,
          amount: parsedAmount,
        },
      });
    } catch (sideEffectError) {
      console.error('Personal expense side effects failed:', sideEffectError);
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Personal expense creation error:', error);
    return NextResponse.json({ error: 'Failed to create personal expense' }, { status: 500 });
  }
}
