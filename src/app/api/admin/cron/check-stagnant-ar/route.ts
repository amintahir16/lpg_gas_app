import { NextRequest, NextResponse } from 'next/server';
import { checkAndNotifyStagnantAR } from '@/lib/arNotifier';

/**
 * POST /api/admin/cron/check-stagnant-ar
 * 
 * Triggered by an external cron job.
 * Requires CRON_SECRET header for security.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the check asynchronously (or wait, depending on cron timeout)
    await checkAndNotifyStagnantAR();

    return NextResponse.json({ 
      success: true, 
      message: 'Stagnant AR check completed successfully' 
    });
  } catch (error) {
    console.error('[AR-Cron] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Support GET for easy manual testing (with secret as param if needed, or just secret header)
export async function GET(request: NextRequest) {
  return POST(request);
}
