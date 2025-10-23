import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all custom items
export async function GET() {
  try {
    const customItems = await prisma.customItem.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ customItems });
  } catch (error) {
    console.error('Failed to fetch custom items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom items' },
      { status: 500 }
    );
  }
}

// POST - Create new custom item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, quantity, costPerPiece, totalCost } = body;

    // Validate required fields
    if (!name || !type || quantity === undefined || costPerPiece === undefined || totalCost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if custom item with same name already exists
    const existingItem = await prisma.customItem.findUnique({
      where: { name }
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Custom item with this name already exists' },
        { status: 400 }
      );
    }

    const customItem = await prisma.customItem.create({
      data: {
        name,
        type,
        quantity: parseInt(quantity),
        costPerPiece: parseFloat(costPerPiece),
        totalCost: parseFloat(totalCost)
      }
    });

    return NextResponse.json({ customItem }, { status: 201 });
  } catch (error) {
    console.error('Failed to create custom item:', error);
    return NextResponse.json(
      { error: 'Failed to create custom item' },
      { status: 500 }
    );
  }
}
