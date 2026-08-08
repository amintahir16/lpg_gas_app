import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notificationAutoReadCutoff } from '@/lib/notification-auto-read';

type SummaryMode = 'stats' | 'bell';

const BELL_LIMIT = 20;

type StatsRow = {
  total: number;
  unread: number;
  urgent: number;
};

type BellRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: string;
  metadata: string | null;
  link: string | null;
  userId: string | null;
  createdAt: Date;
};

function toInt(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
}

/**
 * Postgres `row_to_json` often emits timestamptz as ISO without `Z`.
 * JS then treats that as local time (UTC+5 here) → "5h ago" for events just created.
 * Treat timezone-less ISO datetimes from PG as UTC.
 */
function parsePgTimestamp(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value !== 'string') return new Date(NaN);

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return new Date(`${trimmed}Z`);
  }
  return new Date(trimmed);
}

function parseMetadata(raw: string | null): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Quota-friendly notification summary.
 * - mode=stats (login / tab focus): 1 aggregate SQL for badge counts
 * - mode=bell (dropdown open): 1 CTE SQL for counts + latest 20 rows
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const modeParam = request.nextUrl.searchParams.get('mode');
    const mode: SummaryMode = modeParam === 'bell' ? 'bell' : 'stats';
    const autoReadBefore = notificationAutoReadCutoff();

    if (mode === 'stats') {
      const rows = await prisma.$queryRaw<StatsRow[]>`
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
      return NextResponse.json({
        total: toInt(row?.total),
        unread: toInt(row?.unread),
        urgent: toInt(row?.urgent),
        lastUpdated: new Date().toISOString(),
      });
    }

    // mode=bell — single round-trip: stats + recent rows
    const result = await prisma.$queryRaw<
      Array<{
        total: number;
        unread: number;
        urgent: number;
        notifications: BellRow[] | null;
      }>
    >`
      WITH scoped AS (
        SELECT *
        FROM "notifications"
        WHERE "userId" = ${userId} OR "userId" IS NULL
      ),
      stats AS (
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
        FROM scoped
      ),
      recent AS (
        SELECT
          id,
          type::text AS type,
          title,
          message,
          "isRead",
          priority::text AS priority,
          metadata,
          link,
          "userId",
          "createdAt"
        FROM scoped
        ORDER BY "createdAt" DESC
        LIMIT ${BELL_LIMIT}
      )
      SELECT
        stats.total,
        stats.unread,
        stats.urgent,
        COALESCE(
          (
            SELECT json_agg(row_to_json(recent) ORDER BY recent."createdAt" DESC)
            FROM recent
          ),
          '[]'::json
        ) AS notifications
      FROM stats
    `;

    const row = result[0];
    const rawList = Array.isArray(row?.notifications) ? row.notifications : [];

    const notifications = rawList.map((n) => {
      const createdAt = parsePgTimestamp(n.createdAt);
      const effectiveRead =
        n.isRead || Number.isNaN(createdAt.getTime()) || createdAt < autoReadBefore;
      return {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: effectiveRead,
        priority: n.priority,
        metadata: parseMetadata(n.metadata),
        link: n.link,
        userId: n.userId ?? undefined,
        createdAt: Number.isNaN(createdAt.getTime())
          ? new Date().toISOString()
          : createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      total: toInt(row?.total),
      unread: toInt(row?.unread),
      urgent: toInt(row?.urgent),
      notifications,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Notification summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification summary' },
      { status: 500 }
    );
  }
}
