import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma, VendorCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories: { [key: string]: VendorCategory } = {
      'cylinder-purchase': 'CYLINDER_PURCHASE',
      'gas-purchase': 'GAS_PURCHASE',
      'vaporizer-purchase': 'VAPORIZER_PURCHASE',
      'accessories-purchase': 'ACCESSORIES_PURCHASE',
      'valves-purchase': 'VALVES_PURCHASE'
    };

    const statsPromises = Object.entries(categories).map(async ([categoryKey, categoryEnum]) => {
      try {
        // Get vendor count for this category
        const vendorCount = await prisma.vendor.count({
          where: { category: categoryEnum }
        });

        // Get total purchases for this category
        const purchaseStats = await prisma.purchaseEntry.aggregate({
          where: {
            category: categoryEnum,
            status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] }
          },
          _sum: {
            totalPrice: true
          },
          _count: {
            id: true
          }
        });

        // Get recent activity (vendors created in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentActivity = await prisma.vendor.count({
          where: {
            category: categoryEnum,
            createdAt: {
              gte: sevenDaysAgo
            }
          }
        });

        return {
          category: categoryKey,
          vendorCount,
          totalPurchases: Number(purchaseStats._sum.totalPrice) || 0,
          purchaseCount: purchaseStats._count.id || 0,
          recentActivity
        };
      } catch (error) {
        console.error(`Error fetching stats for ${categoryKey}:`, error);
        return {
          category: categoryKey,
          vendorCount: 0,
          totalPurchases: 0,
          purchaseCount: 0,
          recentActivity: 0
        };
      }
    });

    const stats = await Promise.all(statsPromises);

    return NextResponse.json({
      stats,
      summary: {
        totalVendors: stats.reduce((sum, stat) => sum + stat.vendorCount, 0),
        totalPurchases: stats.reduce((sum, stat) => sum + stat.totalPurchases, 0),
        totalPurchaseCount: stats.reduce((sum, stat) => sum + stat.purchaseCount, 0)
      }
    });
  } catch (error) {
    console.error('Vendor stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor stats' },
      { status: 500 }
    );
  }
}
