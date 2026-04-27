import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity, checkAndNotifyLowAccessoryStock } from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere, withRegionScope } from '@/lib/region';

const prisma = new PrismaClient();

// GET - Fetch all custom items
export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const customItems = await prisma.customItem.findMany({
      where: { isActive: true, ...regionScopedWhere(regionId) },
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
    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const { name, type, quantity, costPerPiece, totalCost } = body;

    // Validate required fields
    if (!name || !type || quantity === undefined || costPerPiece === undefined || totalCost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if custom item with same name AND type already exists in this region
    const existingItem = await prisma.customItem.findFirst({
      where: {
        name,
        type,
        isActive: true,
        ...regionScopedWhere(regionId),
      }
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Item with this type already exists in this category for this branch' },
        { status: 400 }
      );
    }

    const customItem = await prisma.customItem.create({
      data: withRegionScope({
        name,
        type,
        quantity: parseInt(quantity),
        costPerPiece: parseFloat(costPerPiece),
        totalCost: parseFloat(totalCost)
      }, regionId)
    });

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const link = `/inventory/custom-items?category=${encodeURIComponent(customItem.name)}&item=${encodeURIComponent(customItem.id)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CUSTOM_ITEM_CREATED,
          entityType: 'CUSTOM_ITEM',
          entityId: customItem.id,
          details: `Added accessory "${customItem.name} – ${customItem.type}" • Qty: ${customItem.quantity}`,
          link,
          regionId,
          metadata: {
            itemId: customItem.id,
            category: customItem.name,
            type: customItem.type,
            quantity: customItem.quantity,
            costPerPiece: Number(customItem.costPerPiece),
            totalCost: Number(customItem.totalCost),
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Accessory added to inventory',
          message: `${session.user.name || session.user.email} added accessory ${customItem.name} – ${customItem.type} (Qty ${customItem.quantity}).`,
          link,
          priority: 'LOW',
          regionId,
          metadata: {
            domain: 'CUSTOM_ITEM',
            itemId: customItem.id,
          },
        });
      }
      await checkAndNotifyLowAccessoryStock(customItem.id);
    } catch (sideEffectError) {
      console.error('Custom item create side effects failed:', sideEffectError);
    }

    return NextResponse.json({ customItem }, { status: 201 });
  } catch (error) {
    console.error('Failed to create custom item:', error);
    return NextResponse.json(
      { error: 'Failed to create custom item' },
      { status: 500 }
    );
  }
}
