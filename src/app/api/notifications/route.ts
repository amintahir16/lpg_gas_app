import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin, clampLimit } from '@/lib/apiAuth';

const MAX_TITLE_LEN = 200;
const MAX_MESSAGE_LEN = 2000;

// Strip HTML tags and trim whitespace. Notification text is later rendered
// into the DOM via `textContent` (not `innerHTML`) but we still sanitise at
// write-time so stored values look clean wherever they're surfaced (emails,
// admin lists, exports, etc.).
function sanitizeText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

// GET - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = clampLimit(searchParams.get('limit'), 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { userId: session.user.id },
        { userId: null }
      ],
      ...(unreadOnly && { isRead: false })
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          region: {
            select: { id: true, name: true, code: true }
          }
        }
      }),
      prisma.notification.count({ where })
    ]);

    return NextResponse.json({
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Create a new notification.
// Restricted to ADMIN/SUPER_ADMIN. Previously any authenticated user could
// post a global notification (`userId: null`) or target another user's
// userId — combined with the toast-XSS that was patched separately, this
// was a weaponisable spam/XSS path. Locking writes to admins also prevents
// USER/VENDOR sessions from manufacturing fake "system" alerts.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const type = sanitizeText(body.type, 50);
    const title = sanitizeText(body.title, MAX_TITLE_LEN);
    const message = sanitizeText(body.message, MAX_MESSAGE_LEN);
    const userId = typeof body.userId === 'string' && body.userId.length > 0 ? body.userId : null;
    const regionId = typeof body.regionId === 'string' && body.regionId.length > 0 ? body.regionId : null;

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'type, title and message are required' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        userId,
        regionId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        region: { select: { id: true, name: true, code: true } }
      }
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Notification creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: {
          OR: [
            { userId: session.user.id },
            { userId: null }
          ],
          isRead: false
        },
        data: { isRead: true }
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          OR: [
            { userId: session.user.id },
            { userId: null }
          ]
        },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific notification.
// A regular user may only delete THEIR OWN notification. Deleting a global
// notification (`userId === null`) is restricted to admins; otherwise any
// logged-in user could nuke system-wide alerts seen by everyone.
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const isOwn = notification.userId === session.user.id;
    const isGlobal = notification.userId === null;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

    if (!isOwn && !(isGlobal && isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Notification deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
