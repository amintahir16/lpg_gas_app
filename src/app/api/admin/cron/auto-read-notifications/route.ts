import { NextRequest, NextResponse } from 'next/server';
import { markExpiredNotificationsAsRead } from '@/lib/notification-auto-read';

/**
 * POST /api/admin/cron/auto-read-notifications
 *
 * Manual / optional endpoint. Production persistence is piggybacked onto
 * the existing stagnant-AR cron (`/api/admin/cron/check-stagnant-ar`), so
 * you do not need to schedule this separately. Same auth: Bearer CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const marked = await markExpiredNotificationsAsRead();

    return NextResponse.json({
      success: true,
      marked,
      message: `Marked ${marked} notification(s) older than 24 hours as read`,
    });
  } catch (error) {
    console.error('[Notification-AutoRead-Cron] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
