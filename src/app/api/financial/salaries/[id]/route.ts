import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { normalizePaymentMethodKey } from '@/lib/payment-methods';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const session = auth.session;
        const regionId = getActiveRegionId(request);
        const { id } = await params;
        const body = await request.json();
        const { amount, paymentMethod, notes, paidDate } = body;

        const existing = await prisma.salaryRecord.findFirst({
            where: { id, ...regionScopedWhere(regionId) },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
        }

        const data: {
            amount?: number;
            paymentMethod?: string;
            notes?: string | null;
            paidDate?: Date;
        } = {};

        if (amount !== undefined) {
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
            }
            data.amount = parsedAmount;
        }
        if (paymentMethod !== undefined) {
            data.paymentMethod = normalizePaymentMethodKey(paymentMethod) || existing.paymentMethod || 'CASH';
        }
        if (notes !== undefined) {
            const trimmed = notes === null ? null : String(notes).trim();
            data.notes = trimmed ? trimmed : null;
        }
        if (paidDate !== undefined && paidDate !== null && paidDate !== '') {
            const parsedDate = new Date(paidDate);
            if (Number.isNaN(parsedDate.getTime())) {
                return NextResponse.json({ error: 'Invalid paid date' }, { status: 400 });
            }
            data.paidDate = parsedDate;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: 'No salary fields to update' }, { status: 400 });
        }

        const updated = await prisma.salaryRecord.update({
            where: { id },
            data,
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });

        try {
            const monthLabel = format(new Date(updated.year, updated.month - 1, 1), 'MMMM yyyy');
            const employeeName = updated.user.name || existing.user.email || 'Employee';
            const amountNum = Number(updated.amount);
            const previousAmount = Number(existing.amount);
            const actorName = session.user.name || session.user.email || 'A user';
            const link = `/financial/salaries`;
            await logActivity({
                userId: session.user.id,
                action: ActivityAction.SALARY_UPDATED,
                entityType: 'SALARY_RECORD',
                entityId: updated.id,
                details: `Updated salary for ${employeeName} (${monthLabel}) from Rs ${previousAmount.toLocaleString()} to Rs ${amountNum.toLocaleString()}`,
                link,
                regionId,
                metadata: {
                    salaryId: updated.id,
                    employeeId: updated.userId,
                    employeeName,
                    previousAmount,
                    amount: amountNum,
                    month: updated.month,
                    year: updated.year,
                    paymentMethod: updated.paymentMethod,
                    previousPaymentMethod: existing.paymentMethod,
                },
            });
            await notifyUserActivity({
                actorId: session.user.id,
                actorName,
                title: 'Salary updated',
                message: `${actorName} updated ${employeeName}'s ${monthLabel} salary to Rs ${amountNum.toLocaleString()}.`,
                link,
                priority: 'MEDIUM',
                regionId,
                metadata: {
                    domain: 'SALARY_RECORD',
                    salaryId: updated.id,
                    employeeId: updated.userId,
                    employeeName,
                    previousAmount,
                    amount: amountNum,
                },
            });
        } catch (sideEffectError) {
            console.error('Salary update side effects failed:', sideEffectError);
        }

        return NextResponse.json({
            ...updated,
            amount: Number(updated.amount),
        });
    } catch (error) {
        console.error('Salary update error:', error);
        return NextResponse.json({ error: 'Failed to update salary record' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const regionId = getActiveRegionId(request);
        const { id } = await params;
        const existing = await prisma.salaryRecord.findFirst({
            where: { id, ...regionScopedWhere(regionId) },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
        }
        await prisma.salaryRecord.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Salary delete error:', error);
        return NextResponse.json({ error: 'Failed to delete salary record' }, { status: 500 });
    }
}
