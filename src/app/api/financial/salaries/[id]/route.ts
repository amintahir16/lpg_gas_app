import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
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
