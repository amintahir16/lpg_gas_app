import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { createExpenseAddedNotification } from '@/lib/notifications';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin, clampLimit } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 10);
    const skip = (page - 1) * limit;

    const regionId = getActiveRegionId(request);
    const where: Prisma.ExpenseWhereInput = {
      userId: session.user.id,
      ...regionScopedWhere(regionId),
      OR: search ? [
        { description: { contains: search } }
      ] : undefined,
      category: category ? (category as ExpenseCategory) : undefined
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.expense.count({ where })
    ]);

    return NextResponse.json({
      expenses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Expenses fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const body = await request.json();

    const {
      category,
      amount,
      description,
      expenseDate,
      receiptUrl
    } = body;

    if (!category || !description || !amount || !expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: category, description, amount, expenseDate' },
        { status: 400 }
      );
    }

    if (isNaN(Date.parse(expenseDate))) {
      return NextResponse.json(
        { error: 'Invalid expense date provided' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount provided' },
        { status: 400 }
      );
    }

    const regionId = getActiveRegionId(request);
    const expense = await prisma.expense.create({
      data: {
        category: category as ExpenseCategory,
        amount: parsedAmount,
        description,
        expenseDate: new Date(expenseDate),
        receiptUrl: receiptUrl || null,
        userId: session.user.id,
        ...(regionId ? { regionId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    try {
      await createExpenseAddedNotification(
        parseFloat(amount),
        category,
        session.user.email || 'Unknown User',
        description
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Expense creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const body = await request.json();
    const {
      id,
      category,
      amount,
      description,
      expenseDate,
      receiptUrl
    } = body;

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (existingExpense.userId !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        category: category as ExpenseCategory,
        amount: parseFloat(amount),
        description,
        expenseDate: new Date(expenseDate),
        receiptUrl
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Expense update error:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}
