import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Fetch vendor inventory from the database
    const vendorInventory = await prisma.vendorInventory.findMany({
      where: {
        vendorId: vendor.id
      },
      include: {
        cylinder: {
          select: {
            id: true,
            code: true,
            cylinderType: true,
            capacity: true,
            currentStatus: true,
            location: true
          }
        }
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });

    // Transform vendor inventory into the expected format
    const inventory = vendorInventory.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      status: item.status,
      lastUpdated: item.lastUpdated.toISOString().split('T')[0],
      description: item.description,
      cylinderInfo: item.cylinder ? {
        code: item.cylinder.code,
        type: item.cylinder.cylinderType,
        capacity: Number(item.cylinder.capacity),
        status: item.cylinder.currentStatus,
        location: item.cylinder.location
      } : null
    }));

    // Calculate totals
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    return NextResponse.json({
      inventory,
      totalItems,
      totalValue
    });
  } catch (error) {
    console.error('Error fetching vendor inventory:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Vendor access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
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

    const { name, category, quantity, unitPrice, description, cylinderId } = body;

    // Create new inventory item
    const newInventoryItem = await prisma.vendorInventory.create({
      data: {
        vendorId: vendor.id,
        name,
        category,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        description,
        cylinderId: cylinderId || null,
        status: 'IN_STOCK'
      },
      include: {
        cylinder: {
          select: {
            id: true,
            code: true,
            cylinderType: true,
            capacity: true,
            currentStatus: true,
            location: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Inventory item created successfully',
      item: {
        id: newInventoryItem.id,
        name: newInventoryItem.name,
        category: newInventoryItem.category,
        quantity: newInventoryItem.quantity,
        unitPrice: Number(newInventoryItem.unitPrice),
        status: newInventoryItem.status,
        lastUpdated: newInventoryItem.lastUpdated.toISOString().split('T')[0],
        description: newInventoryItem.description,
        cylinderInfo: newInventoryItem.cylinder ? {
          code: newInventoryItem.cylinder.code,
          type: newInventoryItem.cylinder.cylinderType,
          capacity: Number(newInventoryItem.cylinder.capacity),
          status: newInventoryItem.cylinder.currentStatus,
          location: newInventoryItem.cylinder.location
        } : null
      }
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
} 