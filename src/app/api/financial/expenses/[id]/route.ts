import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const regionId = getActiveRegionId(request);
        const { id } = await params;
        const body = await request.json();
        const { amount, description, expenseDate } = body;
        const existing = await prisma.officeExpense.findFirst({
            where: { id, ...regionScopedWhere(regionId) },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }
        const updated = await prisma.officeExpense.update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(description !== undefined && { description }),
                ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
            },
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Office expense update error:', error);
        return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const regionId = getActiveRegionId(request);
        const { id } = await params;
        const existing = await prisma.officeExpense.findFirst({
            where: { id, ...regionScopedWhere(regionId) },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }
        await prisma.officeExpense.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Office expense delete error:', error);
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }
}
