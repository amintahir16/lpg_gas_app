import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all inventory categories and their items from CustomItem table
    const customItems = await prisma.customItem.findMany({
      where: {
        isActive: true,
        quantity: {
          gt: 0 // Only include items with stock
        }
      },
      orderBy: [
        { name: 'asc' },
        { type: 'asc' }
      ]
    });

    // Group items by category
    const categoriesMap = new Map<string, Array<{
      type: string;
      quantity: number;
      costPerPiece: number;
    }>>();

    customItems.forEach(item => {
      const categoryName = item.name;
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, []);
      }
      
      categoriesMap.get(categoryName)!.push({
        type: item.type,
        quantity: item.quantity,
        costPerPiece: Number(item.costPerPiece)
      });
    });

    // Convert to array format
    const categories = Array.from(categoriesMap.entries()).map(([name, items]) => ({
      name,
      items
    }));

    // Sort categories by name
    categories.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      categories,
      totalCategories: categories.length,
      totalItems: customItems.length
    });

  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch inventory categories',
        categories: [],
        totalCategories: 0,
        totalItems: 0
      },
      { status: 500 }
    );
  }
}
