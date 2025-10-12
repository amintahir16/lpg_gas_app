import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const regulators = await prisma.regulator.findMany({
      orderBy: {
        type: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      regulators
    });
  } catch (error) {
    console.error('Error fetching regulators:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch regulators' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, costPerPiece, quantity, totalCost } = body;

    const regulator = await prisma.regulator.create({
      data: {
        type,
        costPerPiece: parseFloat(costPerPiece),
        quantity: parseInt(quantity),
        totalCost: parseFloat(totalCost)
      }
    });

    return NextResponse.json({
      success: true,
      regulator
    });
  } catch (error) {
    console.error('Error creating regulator:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create regulator' },
      { status: 500 }
    );
  }
}
