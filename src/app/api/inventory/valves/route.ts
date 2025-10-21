import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const valves = await prisma.valve.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      valves
    });
  } catch (error) {
    console.error('Error fetching valves:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch valves' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, quantity, costPerPiece, totalCost } = body;

    // Validate required fields
    if (!type || !quantity || !costPerPiece || !totalCost) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const valve = await prisma.valve.create({
      data: {
        type,
        quantity: parseInt(quantity),
        costPerPiece: parseFloat(costPerPiece),
        totalCost: parseFloat(totalCost)
      }
    });

    return NextResponse.json({
      success: true,
      valve
    });
  } catch (error) {
    console.error('Error creating valve:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create valve' },
      { status: 500 }
    );
  }
}
