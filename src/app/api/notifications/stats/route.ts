import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [total, unread, urgent] = await Promise.all([
      prisma.notification.count({
        where: {
          OR: [
            { userId: session.user.id },
            { userId: null } // Global notifications
          ]
        }
      }),
      prisma.notification.count({
        where: {
          OR: [
            { userId: session.user.id },
            { userId: null }
          ],
          isRead: false
        }
      }),
      prisma.notification.count({
        where: {
          OR: [
            { userId: session.user.id },
            { userId: null }
          ],
          priority: 'URGENT',
          isRead: false
        }
      })
    ]);

    return NextResponse.json({
      total,
      unread,
      urgent
    });
  } catch (error) {
    console.error('Notification stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification stats' },
      { status: 500 }
    );
  }
} 