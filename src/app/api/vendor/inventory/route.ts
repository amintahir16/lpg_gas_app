import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Vendor access required' },
        { status: 401 }
      );
    }

    // Get the vendor ID
    const vendor = await prisma.vendor.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Fetch cylinders that are associated with this vendor
    const cylinders = await prisma.cylinder.findMany({
      where: {
        // For now, we'll show all cylinders as vendor inventory
        // In a real implementation, you'd have a vendor-cylinder relationship
        status: {
          in: ['AVAILABLE', 'RENTED', 'MAINTENANCE']
        }
      },
      take: 20 // Limit to 20 items for performance
    });

    // Transform cylinders into vendor inventory format
    const inventory = cylinders.map((cylinder, index) => ({
      id: cylinder.id,
      name: `${cylinder.cylinderType} Gas Cylinder`,
      category: "Cylinders",
      quantity: 1, // Each cylinder is one unit
      unitPrice: cylinder.cylinderType === 'KG_15' ? 150.00 : 450.00,
      status: cylinder.status === 'AVAILABLE' ? 'IN_STOCK' : 
              cylinder.status === 'RENTED' ? 'LOW_STOCK' : 'OUT_OF_STOCK',
      lastUpdated: cylinder.updatedAt.toISOString().split('T')[0]
    }));

    // Add some equipment items based on vendor type
    const equipmentItems = [
      {
        id: "EQUIP-001",
        name: "Safety Equipment",
        category: "Equipment",
        quantity: 50,
        unitPrice: 25.00,
        status: "IN_STOCK",
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      {
        id: "EQUIP-002",
        name: "Regulators",
        category: "Equipment",
        quantity: 30,
        unitPrice: 35.00,
        status: "LOW_STOCK",
        lastUpdated: new Date().toISOString().split('T')[0]
      }
    ];

    const allInventory = [...inventory, ...equipmentItems];

    return NextResponse.json({
      inventory: allInventory,
      totalItems: allInventory.length,
      totalValue: allInventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    });
  } catch (error) {
    console.error('Error fetching vendor inventory:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
} 