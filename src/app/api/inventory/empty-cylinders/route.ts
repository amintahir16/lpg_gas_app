import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get empty cylinders grouped by type
    const emptyCylinders = await prisma.cylinder.findMany({
      where: {
        currentStatus: 'EMPTY'
      },
      select: {
        id: true,
        code: true,
        cylinderType: true
      },
      orderBy: {
        code: 'asc'
      }
    });

    // Group by cylinder type dynamically (handles any cylinder type)
    const groupedCylinders: Record<string, typeof emptyCylinders> = {};
    
    emptyCylinders.forEach(cylinder => {
      const type = cylinder.cylinderType;
      if (!groupedCylinders[type]) {
        groupedCylinders[type] = [];
      }
      groupedCylinders[type].push(cylinder);
    });

    return NextResponse.json({
      success: true,
      cylinders: groupedCylinders
    });
  } catch (error) {
    console.error('Error fetching empty cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch empty cylinders' },
      { status: 500 }
    );
  }
}
