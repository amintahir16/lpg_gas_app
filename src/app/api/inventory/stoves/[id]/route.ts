import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { quality, quantity, costPerPiece } = body;

    const quantityNum = parseInt(quantity);
    const costPerPieceNum = parseFloat(costPerPiece);
    const totalCost = quantityNum * costPerPieceNum;

    const stove = await prisma.stove.update({
      where: {
        id: params.id
      },
      data: {
        quality,
        quantity: quantityNum,
        costPerPiece: costPerPieceNum,
        totalCost: totalCost
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
    console.error('Error updating stove:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stove' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.stove.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting stove:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete stove' },
      { status: 500 }
    );
  }
}
