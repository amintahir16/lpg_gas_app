import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Correct type for dynamic routes in Next.js 15
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const activityLogs = await prisma.activityLog.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 actions
        });

        return NextResponse.json(activityLogs);

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity logs' },
            { status: 500 }
        );
    }
}
