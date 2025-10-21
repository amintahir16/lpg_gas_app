import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const valve = await prisma.valve.findUnique({
      where: { id: params.id }
    });

    if (!valve) {
      return NextResponse.json(
        { success: false, error: 'Valve not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      valve
    });
  } catch (error) {
    console.error('Error fetching valve:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch valve' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const valve = await prisma.valve.update({
      where: { id: params.id },
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
    console.error('Error updating valve:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update valve' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.valve.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Valve deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting valve:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete valve' },
      { status: 500 }
    );
  }
}
