import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, quantity } = body;

    const quantityNum = parseFloat(quantity);
    const totalCost = quantityNum * 50; // Assuming cost per meter is 50 PKR

    const gasPipe = await prisma.gasPipe.update({
      where: {
        id
      },
      data: {
        type,
        quantity: quantityNum,
        totalCost: totalCost
      }
    });

    // Convert Decimal values to numbers for proper JSON serialization
    const gasPipeWithNumbers = {
      ...gasPipe,
      quantity: parseFloat(gasPipe.quantity.toString()),
      totalCost: parseFloat(gasPipe.totalCost.toString())
    };

    return NextResponse.json({
      success: true,
      gasPipe: gasPipeWithNumbers
    });
  } catch (error) {
    console.error('Error updating gas pipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update gas pipe' },
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
    await prisma.gasPipe.delete({
      where: {
        id
      }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting gas pipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete gas pipe' },
      { status: 500 }
    );
  }
}
