import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    
    console.log(`[API] Dashboard stats request - UserId: ${userId}, Role: ${userRole}, Email: ${userEmail}`);
    
    if (!userId) {
      console.log(`[API] No user ID in headers - returning 401`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dashboard statistics
    const [
      totalCustomers,
      activeCylinders,
      totalRevenue,
      pendingOrders,
      recentActivities
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: { isActive: true }
      }),
      
      // Active cylinders (currently rented)
      prisma.cylinderRental.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Monthly revenue (sum of all rental amounts this month)
      prisma.cylinderRental.aggregate({
        where: {
          rentalDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          rentalAmount: true
        }
      }),
      
      // Pending orders (active rentals)
      prisma.cylinderRental.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Recent activities (last 10 rentals)
      prisma.cylinderRental.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          cylinder: true
        }
      })
    ]);

    const stats = {
      totalCustomers,
      activeCylinders,
      monthlyRevenue: totalRevenue._sum.rentalAmount || 0,
      pendingOrders,
      recentActivities: recentActivities.map((rental: any) => ({
        id: rental.id,
        type: 'rental',
        title: `Cylinder Rental`,
        description: `Cylinder ${rental.cylinder.code} rented to ${rental.customer.firstName} ${rental.customer.lastName}`,
        time: rental.createdAt,
        status: 'success'
      }))
    };

    console.log(`[API] Dashboard stats successful - returning data`);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
} 