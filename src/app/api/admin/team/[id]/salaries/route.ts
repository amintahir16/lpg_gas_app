import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { format } from 'date-fns';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const salaryRecords = await prisma.salaryRecord.findMany({
            where: { userId: id },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 50,
        });

        const records = salaryRecords.map((r) => ({
            id: r.id,
            amount: Number(r.amount),
            month: r.month,
            year: r.year,
            monthLabel: format(new Date(r.year, r.month - 1, 1), 'MMMM yyyy'),
            paidDate: r.paidDate,
            paymentMethod: r.paymentMethod,
            notes: r.notes,
        }));

        return NextResponse.json(records);

    } catch (error) {
        console.error('Error fetching salary records:', error);
        return NextResponse.json(
            { error: 'Failed to fetch salary records' },
            { status: 500 }
        );
    }
}
