import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const stoves = await prisma.stove.findMany({
      orderBy: {
        quality: 'asc'
      }
    });

    // Convert Decimal values to numbers for proper JSON serialization
    const stovesWithNumbers = stoves.map(stove => ({
      ...stove,
      costPerPiece: parseFloat(stove.costPerPiece.toString()),
      totalCost: parseFloat(stove.totalCost.toString())
    }));

    return NextResponse.json({
      success: true,
      stoves: stovesWithNumbers
    });
  } catch (error) {
    console.error('Error fetching stoves:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stoves' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quality, quantity, costPerPiece, totalCost } = body;

    const quantityNum = parseInt(quantity);
    const costPerPieceNum = parseFloat(costPerPiece);
    const totalCostNum = parseFloat(totalCost);

    const stove = await prisma.stove.create({
      data: {
        quality,
        quantity: quantityNum,
        costPerPiece: costPerPieceNum,
        totalCost: totalCostNum
      }
    });

    // Convert Decimal values to numbers for proper JSON serialization
    const stoveWithNumbers = {
      ...stove,
      costPerPiece: parseFloat(stove.costPerPiece.toString()),
      totalCost: parseFloat(stove.totalCost.toString())
    };

    return NextResponse.json({
      success: true,
      stove: stoveWithNumbers
    });
  } catch (error) {
    console.error('Error creating stove:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create stove' },
      { status: 500 }
    );
  }
}
