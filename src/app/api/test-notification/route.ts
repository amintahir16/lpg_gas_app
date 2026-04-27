import { NextRequest, NextResponse } from 'next/server';
import { createSimpleNotification } from '@/lib/simpleNotifications';
import { requireSuperAdmin } from '@/lib/apiAuth';

/**
 * Diagnostic endpoint — only reachable in development. Returns 404 in
 * production so we don't expose a notification-spam vector.
 */
export async function POST(_request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 });
  }

  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const notification = await createSimpleNotification(
      'TEST',
      'Test Notification',
      'This is a test notification to verify the system works',
      auth.session.user.email || 'test@example.com'
    );

    return NextResponse.json({
      success: true,
      message: 'Test notification created successfully',
      notification,
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Failed to create test notification' },
      { status: 500 }
    );
  }
}
