import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const gasPipes = await prisma.gasPipe.findMany({
      orderBy: {
        type: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      gasPipes
    });
  } catch (error) {
    console.error('Error fetching gas pipes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gas pipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, quantity, totalCost } = body;

    const gasPipe = await prisma.gasPipe.create({
      data: {
        type,
        quantity: parseFloat(quantity),
        totalCost: parseFloat(totalCost)
      }
    });

    return NextResponse.json({
      success: true,
      gasPipe
    });
  } catch (error) {
    console.error('Error creating gas pipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create gas pipe' },
      { status: 500 }
    );
  }
}
