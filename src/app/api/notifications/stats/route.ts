import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Lightweight stats for the notification bell / polling.
 * Previously this ran 8 Prisma queries (counts by priority + groupBy + recent).
 * The UI only needs total / unread / urgent — 3 queries — which cuts ops by ~60%
 * on every poll cycle.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always derive scope from the authenticated session — never accept a
    // `?userId=` from the query string (IDOR).
    const userId = session.user.id;

    const baseWhere = {
      OR: [{ userId }, { userId: null }],
    };

    const [total, unread, urgent] = await Promise.all([
      prisma.notification.count({ where: baseWhere }),
      prisma.notification.count({
        where: { ...baseWhere, isRead: false },
      }),
      prisma.notification.count({
        where: {
          ...baseWhere,
          priority: 'URGENT',
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      total,
      unread,
      urgent,
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
