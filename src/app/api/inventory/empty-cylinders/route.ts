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

    // Group by cylinder type
    const groupedCylinders = {
      domestic: emptyCylinders.filter(cylinder => cylinder.cylinderType === 'DOMESTIC_11_8KG'),
      standard: emptyCylinders.filter(cylinder => cylinder.cylinderType === 'STANDARD_15KG'),
      commercial: emptyCylinders.filter(cylinder => cylinder.cylinderType === 'COMMERCIAL_45_4KG')
    };

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
