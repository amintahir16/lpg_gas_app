import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fetch only custom items data
    const customItems = await prisma.customItem.findMany({ 
      where: { isActive: true } 
    });

    // Calculate totals
    const totalCustomItems = customItems.reduce((sum, item) => sum + Number(item.quantity), 0);

    // Calculate total values
    const customItemsTotalCost = customItems.reduce((sum, item) => sum + parseFloat(item.totalCost.toString()), 0);

    const stats = {
      totalCustomItems,
      totalValue: customItemsTotalCost
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching accessories stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accessories stats' },
      { status: 500 }
    );
  }
}