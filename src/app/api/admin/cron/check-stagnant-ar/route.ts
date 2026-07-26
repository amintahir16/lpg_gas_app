import { NextRequest, NextResponse } from 'next/server';
import { checkAndNotifyStagnantAR } from '@/lib/arNotifier';
import { markExpiredNotificationsAsRead } from '@/lib/notification-auto-read';

/**
 * POST /api/admin/cron/check-stagnant-ar
 *
 * Triggered by the existing external cron job (CRON_SECRET).
 * Also persists the 24-hour notification auto-read rule in the same run
 * so no second scheduled job is needed. The UI already applies that rule
 * at read time for free; this write just keeps the DB in sync.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await checkAndNotifyStagnantAR();

    let autoReadMarked = 0;
    try {
      autoReadMarked = await markExpiredNotificationsAsRead();
    } catch (autoReadError) {
      // Never let housekeeping fail the primary AR check.
      console.error('[AR-Cron] Auto-read notifications failed:', autoReadError);
    }

    return NextResponse.json({
      success: true,
      message: 'Stagnant AR check completed successfully',
      autoReadMarked,
    });
  } catch (error) {
    console.error('[AR-Cron] Error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Support GET for easy manual testing (with secret as param if needed, or just secret header)
export async function GET(request: NextRequest) {
  return POST(request);
}
