import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        // Fetch all active users (employees)
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                phone: true,
            },
            orderBy: { name: 'asc' },
        });
        // Fetch salary records for the selected month
        const salaryRecords = await prisma.salaryRecord.findMany({
            where: { month, year },
            include: {
                user: {
                    select: { id: true, name: true, firstName: true, lastName: true, role: true },
                },
            },
            orderBy: { paidDate: 'desc' },
        });
        const paidUserIds = new Set(salaryRecords.map((s) => s.userId));
        // Build employee list with salary status
        const employees = users.map((user) => {
            const salaryRecord = salaryRecords.find((s) => s.userId === user.id);
            return {
                id: user.id,
                name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                role: user.role,
                email: user.email,
                phone: user.phone,
                isPaid: paidUserIds.has(user.id),
                salaryRecord: salaryRecord
                    ? {
                        id: salaryRecord.id,
                        amount: Number(salaryRecord.amount),
                        paidDate: salaryRecord.paidDate,
                        paymentMethod: salaryRecord.paymentMethod,
                        notes: salaryRecord.notes,
                    }
                    : null,
            };
        });
        // Salary history (all records, last 50)
        const history = await prisma.salaryRecord.findMany({
            take: 50,
            orderBy: { paidDate: 'desc' },
            include: {
                user: {
                    select: { id: true, name: true, firstName: true, lastName: true, role: true },
                },
            },
        });
        const totalPaid = salaryRecords.reduce((sum, s) => sum + Number(s.amount), 0);
        const totalEmployees = users.length;
        const paidCount = paidUserIds.size;
        return NextResponse.json({
            employees,
            history: history.map((h) => ({
                id: h.id,
                employeeName: h.user.name || `${h.user.firstName || ''} ${h.user.lastName || ''}`.trim(),
                role: h.user.role,
                amount: Number(h.amount),
                month: h.month,
                year: h.year,
                monthLabel: format(new Date(h.year, h.month - 1, 1), 'MMMM yyyy'),
                paidDate: h.paidDate,
                paymentMethod: h.paymentMethod,
                notes: h.notes,
            })),
            summary: {
                totalEmployees,
                paidCount,
                unpaidCount: totalEmployees - paidCount,
                totalPaid,
            },
            month,
            year,
        });
    } catch (error) {
        console.error('Salaries API error:', error);
        return NextResponse.json({ error: 'Failed to fetch salary data' }, { status: 500 });
    }
}
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { userId, amount, month, year, paymentMethod, notes } = body;
        if (!userId || !amount || !month || !year) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, amount, month, year' },
                { status: 400 }
            );
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }
        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        // Check for duplicate
        const existing = await prisma.salaryRecord.findFirst({
            where: { userId, month: parseInt(month), year: parseInt(year) },
        });
        if (existing) {
            const monthName = format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy');
            return NextResponse.json(
                { error: `Salary already paid to ${user.name || user.email} for ${monthName}` },
                { status: 409 }
            );
        }
        const salaryRecord = await prisma.salaryRecord.create({
            data: {
                userId,
                amount: parsedAmount,
                month: parseInt(month),
                year: parseInt(year),
                paidDate: new Date(),
                paymentMethod: paymentMethod || 'CASH',
                notes: notes || null,
                createdBy: session.user.id,
            },
            include: {
                user: {
                    select: { id: true, name: true, role: true },
                },
            },
        });
        try {
            const monthLabel = format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy');
            const employeeName = salaryRecord.user.name || user.email || 'Employee';
            const link = `/team/${userId}`;
            await logActivity({
                userId: session.user.id,
                action: ActivityAction.SALARY_PAID,
                entityType: 'SALARY_RECORD',
                entityId: salaryRecord.id,
                details: `Paid Rs ${parsedAmount.toLocaleString()} salary to ${employeeName} for ${monthLabel}`,
                link,
                metadata: {
                    salaryId: salaryRecord.id,
                    employeeId: userId,
                    employeeName,
                    amount: parsedAmount,
                    month: parseInt(month),
                    year: parseInt(year),
                    paymentMethod: salaryRecord.paymentMethod,
                },
            });
            await notifyUserActivity({
                actorId: session.user.id,
                actorName: session.user.name || session.user.email || 'A user',
                title: 'Salary paid',
                message: `${session.user.name || session.user.email} paid Rs ${parsedAmount.toLocaleString()} salary to ${employeeName} for ${monthLabel}.`,
                link,
                priority: 'MEDIUM',
                metadata: {
                    domain: 'SALARY_RECORD',
                    salaryId: salaryRecord.id,
                    employeeId: userId,
                    employeeName,
                    amount: parsedAmount,
                },
            });
        } catch (sideEffectError) {
            console.error('Salary side effects failed:', sideEffectError);
        }
        return NextResponse.json(salaryRecord, { status: 201 });
    } catch (error) {
        console.error('Salary creation error:', error);
        return NextResponse.json({ error: 'Failed to record salary' }, { status: 500 });
    }
}