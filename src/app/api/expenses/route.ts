import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { createExpenseAddedNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      userId: session.user.id,
      OR: search ? [
        { description: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
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
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.expense.count({ where })
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('API received body:', body);
    
    const {
      category,
      amount,
      description,
      expenseDate,
      receiptUrl
    } = body;

    // Validate required fields
    if (!category || !description || !amount || !expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: category, description, amount, expenseDate' },
        { status: 400 }
      );
    }

    // Validate date before creating
    if (isNaN(Date.parse(expenseDate))) {
      return NextResponse.json(
        { error: 'Invalid expense date provided' },
        { status: 400 }
      );
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount provided' },
        { status: 400 }
      );
    }

    console.log('Creating expense with data:', {
      category,
      amount: parsedAmount,
      description,
      expenseDate: new Date(expenseDate),
      receiptUrl,
      userId: session.user.id
    });

    const expense = await prisma.expense.create({
      data: {
        category: category as ExpenseCategory,
        amount: parsedAmount,
        description,
        expenseDate: new Date(expenseDate),
        receiptUrl: receiptUrl || null,
        userId: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for new expense
    try {
      await createExpenseAddedNotification(
        parseFloat(amount), 
        category, 
        session.user.email || 'Unknown User'
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the main operation if notification fails
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
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      category,
      amount,
      description,
      expenseDate,
      receiptUrl
    } = body;

    // Verify the expense belongs to the user
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
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