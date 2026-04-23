import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { format, subMonths } from 'date-fns';
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const type = searchParams.get('type') || ''; // 'RENT' or 'DAILY' or '' for all
        const skip = (page - 1) * limit;
        const where: any = {};
        if (type) where.type = type;
        const [expenses, total] = await Promise.all([
            prisma.officeExpense.findMany({
                where,
                skip,
                take: limit,
                orderBy: { expenseDate: 'desc' },
            }),
            prisma.officeExpense.count({ where }),
        ]);
        // Current month rent status
        const now = new Date();
        const currentMonthRent = await prisma.officeExpense.findFirst({
            where: {
                type: 'RENT',
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            },
        });
        // Monthly chart data for daily expenses (last 6 months)
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const chartMonth = subMonths(now, i);
            const chartStart = new Date(chartMonth.getFullYear(), chartMonth.getMonth(), 1);
            const chartEnd = new Date(chartMonth.getFullYear(), chartMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            const dailyTotal = await prisma.officeExpense.aggregate({
                where: {
                    type: 'DAILY',
                    expenseDate: { gte: chartStart, lte: chartEnd },
                },
                _sum: { amount: true },
            });
            const rentTotal = await prisma.officeExpense.aggregate({
                where: {
                    type: 'RENT',
                    expenseDate: { gte: chartStart, lte: chartEnd },
                },
                _sum: { amount: true },
            });
            chartData.push({
                name: format(chartStart, 'MMM yyyy'),
                daily: Number(dailyTotal._sum.amount || 0),
                rent: Number(rentTotal._sum.amount || 0),
            });
        }
        return NextResponse.json({
            expenses,
            currentMonthRent,
            chartData,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Office expenses fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch office expenses' }, { status: 500 });
    }
}
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { type, amount, description, expenseDate, month, year } = body;
        if (!type || !amount || !description || !expenseDate) {
            return NextResponse.json(
                { error: 'Missing required fields: type, amount, description, expenseDate' },
                { status: 400 }
            );
        }
        if (!['RENT', 'DAILY'].includes(type)) {
            return NextResponse.json({ error: 'Type must be RENT or DAILY' }, { status: 400 });
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }
        // For RENT type, enforce one per month
        if (type === 'RENT') {
            const rentMonth = month || new Date(expenseDate).getMonth() + 1;
            const rentYear = year || new Date(expenseDate).getFullYear();
            const existing = await prisma.officeExpense.findFirst({
                where: { type: 'RENT', month: rentMonth, year: rentYear },
            });
            if (existing) {
                return NextResponse.json(
                    { error: `Office rent already recorded for ${format(new Date(rentYear, rentMonth - 1, 1), 'MMMM yyyy')}` },
                    { status: 409 }
                );
            }
            const expense = await prisma.officeExpense.create({
                data: {
                    type: 'RENT',
                    amount: parsedAmount,
                    description,
                    expenseDate: new Date(expenseDate),
                    month: rentMonth,
                    year: rentYear,
                    createdBy: session.user.id,
                },
            });
            return NextResponse.json(expense, { status: 201 });
        }
        // DAILY type
        const expense = await prisma.officeExpense.create({
            data: {
                type: 'DAILY',
                amount: parsedAmount,
                description,
                expenseDate: new Date(expenseDate),
                createdBy: session.user.id,
            },
        });
        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        console.error('Office expense creation error:', error);
        return NextResponse.json({ error: 'Failed to create office expense' }, { status: 500 });
    }
}
