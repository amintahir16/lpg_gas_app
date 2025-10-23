import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get all records and calculate totals manually to avoid Decimal issues
    const regulators = await prisma.regulator.findMany();
    const gasPipes = await prisma.gasPipe.findMany();
    const stoves = await prisma.stove.findMany();
    const valves = await prisma.valve.findMany();
    const customItems = await prisma.customItem.findMany({
      where: { isActive: true }
    });

    // Calculate totals manually with proper number conversion
    const totalRegulators = regulators.reduce((sum, reg) => sum + Number(reg.quantity), 0);
    const totalGasPipes = gasPipes.reduce((sum, pipe) => sum + Number(pipe.quantity), 0);
    const totalStoves = stoves.reduce((sum, stove) => sum + Number(stove.quantity), 0);
    const totalValves = valves.reduce((sum, valve) => sum + Number(valve.quantity), 0);
    const totalCustomItems = customItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    
    const regulatorsTotalCost = regulators.reduce((sum, reg) => sum + parseFloat(reg.totalCost.toString()), 0);
    const gasPipesTotalCost = gasPipes.reduce((sum, pipe) => sum + parseFloat(pipe.totalCost.toString()), 0);
    const stovesTotalCost = stoves.reduce((sum, stove) => sum + parseFloat(stove.totalCost.toString()), 0);
    const valvesTotalCost = valves.reduce((sum, valve) => sum + parseFloat(valve.totalCost.toString()), 0);
    const customItemsTotalCost = customItems.reduce((sum, item) => sum + parseFloat(item.totalCost.toString()), 0);
    
    const totalValue = regulatorsTotalCost + gasPipesTotalCost + stovesTotalCost + valvesTotalCost + customItemsTotalCost;

    const stats = {
      totalRegulators,
      totalGasPipes,
      totalStoves,
      totalValves,
      totalCustomItems,
      totalValue
    };

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching accessories stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accessories stats' },
      { status: 500 }
    );
  }
}
