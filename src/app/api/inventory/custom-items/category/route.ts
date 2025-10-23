import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get all custom item categories (unique names)
export async function GET() {
  try {
    const categories = await prisma.customItem.findMany({
      where: { isActive: true },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ 
      success: true, 
      categories: categories.map(cat => cat.name) 
    });
  } catch (error) {
    console.error('Error fetching custom item categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new category (when adding first item to a new category)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existingCategory = await prisma.customItem.findFirst({
      where: { 
        name: name,
        isActive: true 
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Category ready for items' 
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
