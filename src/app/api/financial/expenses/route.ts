import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
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
        const session = auth.session;
        const regionId = getActiveRegionId(request);
        const regionScope = regionScopedWhere(regionId);
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = clampLimit(searchParams.get('limit'), 100);
        const type = searchParams.get('type') || '';
        const skip = (page - 1) * limit;

        const resolved = resolveFinancialPeriod({
            period: searchParams.get('period'),
            date: searchParams.get('date'),
            month: searchParams.get('month'),
            year: searchParams.get('year'),
        });
        const { startDate, endDate, period, month, year, date, label } = resolved;

        const where: any = {
            ...regionScope,
            expenseDate: { gte: startDate, lte: endDate },
        };
        if (type) where.type = type;

        const [expenses, total, periodAgg, dailyCount, rentAgg, vehicleAgg, personalAgg] = await Promise.all([
            prisma.officeExpense.findMany({
                where,
                skip,
                take: limit,
                orderBy: { expenseDate: 'desc' },
            }),
            prisma.officeExpense.count({ where }),
            prisma.officeExpense.aggregate({
                where,
                _sum: { amount: true },
            }),
            prisma.officeExpense.count({
                where: { ...where, type: 'DAILY' },
            }),
            prisma.officeExpense.aggregate({
                where: { ...where, type: 'RENT' },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.officeExpense.aggregate({
                where: { ...where, type: 'VEHICLE' },
                _sum: { amount: true },
            }),
            prisma.personalExpense.aggregate({
                where: {
                    expenseDate: { gte: startDate, lte: endDate },
                    ...regionScope,
                },
                _sum: { amount: true },
                _count: true,
            }),
        ]);

        const personalExpenses = await prisma.personalExpense.findMany({
            where: {
                expenseDate: { gte: startDate, lte: endDate },
                ...regionScope,
            },
            orderBy: { expenseDate: 'desc' },
            take: limit,
        });

        const rentInPeriod = await prisma.officeExpense.findFirst({
            where: { ...where, type: 'RENT' },
            orderBy: { expenseDate: 'desc' },
        });

        // Calendar "current month rent" status (operational, independent of filter)
        const now = new Date();
        const currentMonthRent = await prisma.officeExpense.findFirst({
            where: {
                type: 'RENT',
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                ...regionScope,
            },
        });

        const chartBuckets = getFinancialChartBuckets(resolved);
        const chartData = [];
        for (const bucket of chartBuckets) {
            const [dailyTotal, rentTotal, vehicleTotal, personalTotal] = await Promise.all([
                prisma.officeExpense.aggregate({
                    where: {
                        type: 'DAILY',
                        expenseDate: { gte: bucket.startDate, lte: bucket.endDate },
                        ...regionScope,
                    },
                    _sum: { amount: true },
                }),
                prisma.officeExpense.aggregate({
                    where: {
                        type: 'RENT',
                        expenseDate: { gte: bucket.startDate, lte: bucket.endDate },
                        ...regionScope,
                    },
                    _sum: { amount: true },
                }),
                prisma.officeExpense.aggregate({
                    where: {
                        type: 'VEHICLE',
                        expenseDate: { gte: bucket.startDate, lte: bucket.endDate },
                        ...regionScope,
                    },
                    _sum: { amount: true },
                }),
                prisma.personalExpense.aggregate({
                    where: {
                        expenseDate: { gte: bucket.startDate, lte: bucket.endDate },
                        ...regionScope,
                    },
                    _sum: { amount: true },
                }),
            ]);
            chartData.push({
                name: bucket.name,
                daily: Number(dailyTotal._sum.amount || 0),
                rent: Number(rentTotal._sum.amount || 0),
                vehicle: Number(vehicleTotal._sum.amount || 0),
                personal: Number(personalTotal._sum.amount || 0),
            });
        }

        const officeTotal = Number(periodAgg._sum.amount || 0);
        const personalTotal = Number(personalAgg._sum.amount || 0);

        return NextResponse.json({
            expenses,
            personalExpenses,
            currentMonthRent,
            rentInPeriod,
            chartData,
            summary: {
                totalExpenses: officeTotal + personalTotal,
                officeTotal,
                personalTotal,
                personalCount: personalAgg._count || 0,
                dailyCount,
                vehicleTotal: Number(vehicleAgg._sum.amount || 0),
                rentAmount: Number(rentAgg._sum.amount || 0),
                rentCount: rentAgg._count || 0,
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
        console.error('Office expenses fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch office expenses' }, { status: 500 });
    }
}
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const session = auth.session;
        const regionId = getActiveRegionId(request);
        const body = await request.json();
        const { type, amount, description, expenseDate, month, year, paymentMethod } = body;
        if (!type || !amount || !description || !expenseDate) {
            return NextResponse.json(
                { error: 'Missing required fields: type, amount, description, expenseDate' },
                { status: 400 }
            );
        }
        if (!['RENT', 'DAILY', 'VEHICLE'].includes(type)) {
            return NextResponse.json({ error: 'Type must be RENT, DAILY, or VEHICLE' }, { status: 400 });
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }
        const methodKey = normalizePaymentMethodKey(paymentMethod) || 'CASH';
        // For RENT type, enforce one per month
        if (type === 'RENT') {
            const rentMonth = month || new Date(expenseDate).getMonth() + 1;
            const rentYear = year || new Date(expenseDate).getFullYear();
            const existing = await prisma.officeExpense.findFirst({
                where: { type: 'RENT', month: rentMonth, year: rentYear, ...regionScopedWhere(regionId) },
            });
            if (existing) {
                return NextResponse.json(
                    { error: `Office rent already recorded for ${format(new Date(rentYear, rentMonth - 1, 1), 'MMMM yyyy')} for this branch` },
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
                    paymentMethod: methodKey,
                    createdBy: session.user.id,
                    ...(regionId ? { regionId } : {}),
                },
            });
            try {
                const monthLabel = format(new Date(rentYear, rentMonth - 1, 1), 'MMMM yyyy');
                const link = `/financial/expenses`;
                await logActivity({
                    userId: session.user.id,
                    action: ActivityAction.OFFICE_EXPENSE_CREATED,
                    entityType: 'OFFICE_EXPENSE',
                    entityId: expense.id,
                    details: `Recorded RENT expense Rs ${parsedAmount.toLocaleString()} for ${monthLabel} • ${description}`,
                    link,
                    regionId,
                    metadata: {
                        expenseId: expense.id,
                        type: 'RENT',
                        amount: parsedAmount,
                        month: rentMonth,
                        year: rentYear,
                    },
                });
                await notifyUserActivity({
                    actorId: session.user.id,
                    actorName: session.user.name || session.user.email || 'A user',
                    title: 'Office rent recorded',
                    message: `${session.user.name || session.user.email} recorded Rs ${parsedAmount.toLocaleString()} office rent for ${monthLabel}.`,
                    link,
                    priority: 'MEDIUM',
                    regionId,
                    metadata: {
                        domain: 'OFFICE_EXPENSE',
                        expenseId: expense.id,
                        type: 'RENT',
                        amount: parsedAmount,
                    },
                });
            } catch (sideEffectError) {
                console.error('Office expense (rent) side effects failed:', sideEffectError);
            }
            return NextResponse.json(expense, { status: 201 });
        }
        // DAILY or VEHICLE type
        const expenseType = type as 'DAILY' | 'VEHICLE';
        const expense = await prisma.officeExpense.create({
            data: {
                type: expenseType,
                amount: parsedAmount,
                description,
                expenseDate: new Date(expenseDate),
                paymentMethod: methodKey,
                createdBy: session.user.id,
                ...(regionId ? { regionId } : {}),
            },
        });
        try {
            const link = `/financial/expenses`;
            const typeLabel = expenseType === 'VEHICLE' ? 'Vehicle' : 'Daily';
            await logActivity({
                userId: session.user.id,
                action: ActivityAction.OFFICE_EXPENSE_CREATED,
                entityType: 'OFFICE_EXPENSE',
                entityId: expense.id,
                details: `Recorded ${expenseType} expense Rs ${parsedAmount.toLocaleString()} • ${description}`,
                link,
                regionId,
                metadata: {
                    expenseId: expense.id,
                    type: expenseType,
                    amount: parsedAmount,
                    description,
                },
            });
            await notifyUserActivity({
                actorId: session.user.id,
                actorName: session.user.name || session.user.email || 'A user',
                title: `${typeLabel} expense recorded`,
                message: `${session.user.name || session.user.email} recorded Rs ${parsedAmount.toLocaleString()} ${typeLabel.toLowerCase()} expense • ${description}.`,
                link,
                priority: 'LOW',
                regionId,
                metadata: {
                    domain: 'OFFICE_EXPENSE',
                    expenseId: expense.id,
                    type: expenseType,
                    amount: parsedAmount,
                },
            });
        } catch (sideEffectError) {
            console.error(`Office expense (${expenseType.toLowerCase()}) side effects failed:`, sideEffectError);
        }
        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        console.error('Office expense creation error:', error);
        return NextResponse.json({ error: 'Failed to create office expense' }, { status: 500 });
    }
}
