import { NextRequest, NextResponse } from 'next/server';
import { 
  getSimpleNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getNotificationStats 
} from '@/lib/simpleNotifications';

// GET - Fetch notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await getSimpleNotifications(
      undefined, // userId - for now, show all notifications
      unreadOnly,
      limit
    );

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total: notifications.length,
        pages: Math.ceil(notifications.length / limit)
      }
    });
  } catch (error) {
    console.error('Simple notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAllAsRead: markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      await markAllNotificationsAsRead();
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      for (const id of notificationIds) {
        await markNotificationAsRead(id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Simple notification update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
} 