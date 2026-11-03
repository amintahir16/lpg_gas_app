import { prisma } from '@/lib/db';

/**
 * Unread notifications older than this window are treated as read.
 * Measured from `createdAt` (issuance time), not from first view.
 *
 * Quota-friendly design, two layers:
 *
 * 1. READ TIME (free): the notification list / stats APIs never write.
 *    They compute effective read state with `notificationAutoReadCutoff()`
 *    in their existing queries, so the UI flips to "read" at exactly 24h
 *    without costing a single extra DB request.
 *
 * 2. PERSISTENCE (existing cron): `markExpiredNotificationsAsRead()` runs
 *    inside the stagnant-AR cron (`/api/admin/cron/check-stagnant-ar`) —
 *    same schedule and CRON_SECRET you already use. No second job needed.
 *    A standalone `/api/admin/cron/auto-read-notifications` endpoint exists
 *    only for manual testing.
 */
export const NOTIFICATION_AUTO_READ_HOURS = 24;
export const NOTIFICATION_AUTO_READ_MS =
  NOTIFICATION_AUTO_READ_HOURS * 60 * 60 * 1000;

/** Notifications created before this instant count as read. */
export function notificationAutoReadCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - NOTIFICATION_AUTO_READ_MS);
}

/**
 * Persist the auto-read rule: one `updateMany` marking every unread
 * notification older than 24 hours as read. Called from the existing
 * stagnant-AR cron — do NOT call this from request handlers; that is what
 * the read-time cutoff is for.
 */
export async function markExpiredNotificationsAsRead(
  now: Date = new Date()
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      isRead: false,
      createdAt: { lt: notificationAutoReadCutoff(now) },
    },
    data: { isRead: true },
  });
  return result.count;
}

/**
 * Bell notifications are deleted after this many days. The same events stay in
 * activity_logs (Team → Activity), which is the permanent audit trail.
 */
export const NOTIFICATION_RETENTION_DAYS = 60;

/** Deletes notifications older than the retention window. Called from the stagnant-AR cron. */
export async function deleteNotificationsPastRetention(
  now: Date = new Date()
): Promise<number> {
  const cutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
