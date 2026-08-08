import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notificationAutoReadCutoff } from '@/lib/notification-auto-read';

/**
 * Lightweight stats for the notification bell badge.
 * Single conditional-aggregation SQL (was 3 separate counts).
 * Prefer /api/notifications/summary?mode=stats for new callers.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const autoReadBefore = notificationAutoReadCutoff();

    const rows = await prisma.$queryRaw<
      Array<{ total: number; unread: number; urgent: number }>
    >`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE "isRead" = false AND "createdAt" >= ${autoReadBefore}
        )::int AS unread,
        COUNT(*) FILTER (
          WHERE "isRead" = false
            AND "priority" = CAST('URGENT' AS "NotificationPriority")
            AND "createdAt" >= ${autoReadBefore}
        )::int AS urgent
      FROM "notifications"
      WHERE "userId" = ${userId} OR "userId" IS NULL
    `;

    const row = rows[0];
    const toInt = (v: unknown) =>
      typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : 0;

    return NextResponse.json({
      total: toInt(row?.total),
      unread: toInt(row?.unread),
      urgent: toInt(row?.urgent),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Notification stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification statistics' },
      { status: 500 }
    );
  }
}
