import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, costPerPiece, quantity, totalCost } = body;

    const quantityNum = parseInt(quantity);
    const costPerPieceNum = parseFloat(costPerPiece);
    const totalCostNum = parseFloat(totalCost);

    const regulator = await prisma.regulator.update({
      where: {
        id
      },
      data: {
        type,
        costPerPiece: costPerPieceNum,
        quantity: quantityNum,
        totalCost: totalCostNum
      }
    });

    // Convert Decimal values to numbers for proper JSON serialization
    const regulatorWithNumbers = {
      ...regulator,
      costPerPiece: parseFloat(regulator.costPerPiece.toString()),
      totalCost: parseFloat(regulator.totalCost.toString())
    };

    return NextResponse.json({
      success: true,
      regulator: regulatorWithNumbers
    });
  } catch (error) {
    console.error('Error updating regulator:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update regulator' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.regulator.delete({
      where: {
        id
      }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting regulator:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete regulator' },
      { status: 500 }
    );
  }
}
