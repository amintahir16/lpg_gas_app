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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Base where clause for user's notifications
    const baseWhere = {
      OR: [
        { userId },
        { userId: null } // Global notifications
      ]
    };

    // Get comprehensive notification statistics
    const [
      total,
      unread,
      urgent,
      high,
      medium,
      low,
      byType,
      recentActivity
    ] = await Promise.all([
      // Total notifications
      prisma.notification.count({ where: baseWhere }),
      
      // Unread notifications
      prisma.notification.count({
        where: {
          ...baseWhere,
          isRead: false
        }
      }),
      
      // Urgent priority notifications
      prisma.notification.count({
        where: {
          ...baseWhere,
          priority: 'URGENT',
          isRead: false
        }
      }),
      
      // High priority notifications
      prisma.notification.count({
        where: {
          ...baseWhere,
          priority: 'HIGH',
          isRead: false
        }
      }),
      
      // Medium priority notifications
      prisma.notification.count({
        where: {
          ...baseWhere,
          priority: 'MEDIUM',
          isRead: false
        }
      }),
      
      // Low priority notifications
      prisma.notification.count({
        where: {
          ...baseWhere,
          priority: 'LOW',
          isRead: false
        }
      }),
      
      // Notifications by type
      prisma.notification.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: {
          id: true
        }
      }),
      
      // Recent activity (last 24 hours)
      prisma.notification.count({
        where: {
          ...baseWhere,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Format type statistics
    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Calculate read rate
    const readRate = total > 0 ? ((total - unread) / total * 100).toFixed(1) : 0;

    // Get priority distribution
    const priorityDistribution = {
      urgent: urgent,
      high: high,
      medium: medium,
      low: low
    };

    return NextResponse.json({
      total,
      unread,
      urgent,
      high,
      medium,
      low,
      readRate: parseFloat(readRate),
      priorityDistribution,
      typeStats,
      recentActivity,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Notification stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification statistics' },
      { status: 500 }
    );
  }
} 