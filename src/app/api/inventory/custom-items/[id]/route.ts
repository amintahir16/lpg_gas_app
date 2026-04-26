import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity, checkAndNotifyLowAccessoryStock } from '@/lib/superAdminNotifier';

const prisma = new PrismaClient();

// PUT - Update custom item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, quantity, costPerPiece, totalCost } = body;

    // Validate required fields
    if (!name || !type || quantity === undefined || costPerPiece === undefined || totalCost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if custom item exists
    const existingItem = await prisma.customItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Custom item not found' },
        { status: 404 }
      );
    }

    // Check if another custom item with same name AND type exists (excluding current item)
    const duplicateItem = await prisma.customItem.findFirst({
      where: {
        name,
        type,
        isActive: true,
        id: { not: id }
      }
    });

    if (duplicateItem) {
      return NextResponse.json(
        { error: 'Item with this type already exists in this category' },
        { status: 400 }
      );
    }

    const customItem = await prisma.customItem.update({
      where: { id },
      data: {
        name,
        type,
        quantity: parseInt(quantity),
        costPerPiece: parseFloat(costPerPiece),
        totalCost: parseFloat(totalCost)
      }
    });

    try {
      const session = await getServerSession(authOptions);
      const qtyChanged = existingItem.quantity !== customItem.quantity;
      if (session?.user?.id) {
        const link = `/inventory/custom-items?category=${encodeURIComponent(customItem.name)}&item=${encodeURIComponent(customItem.id)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CUSTOM_ITEM_UPDATED,
          entityType: 'CUSTOM_ITEM',
          entityId: customItem.id,
          details: `Updated accessory "${customItem.name} – ${customItem.type}"${qtyChanged ? ` • Qty: ${existingItem.quantity} → ${customItem.quantity}` : ''}`,
          link,
          metadata: {
            itemId: customItem.id,
            category: customItem.name,
            type: customItem.type,
            previousQuantity: existingItem.quantity,
            quantity: customItem.quantity,
            quantityChanged: qtyChanged,
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Accessory updated',
          message: `${session.user.name || session.user.email} updated accessory ${customItem.name} – ${customItem.type}${qtyChanged ? ` (Qty ${existingItem.quantity} → ${customItem.quantity})` : ''}.`,
          link,
          priority: 'LOW',
          metadata: {
            domain: 'CUSTOM_ITEM',
            itemId: customItem.id,
          },
        });
      }
      await checkAndNotifyLowAccessoryStock(customItem.id);
    } catch (sideEffectError) {
      console.error('Custom item update side effects failed:', sideEffectError);
    }

    return NextResponse.json({ customItem });
  } catch (error) {
    console.error('Failed to update custom item:', error);
    return NextResponse.json(
      { error: 'Failed to update custom item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete custom item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if custom item exists
    const existingItem = await prisma.customItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Custom item not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.customItem.update({
      where: { id },
      data: { isActive: false }
    });

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const link = `/inventory/custom-items?category=${encodeURIComponent(existingItem.name)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CUSTOM_ITEM_DELETED,
          entityType: 'CUSTOM_ITEM',
          entityId: existingItem.id,
          details: `Deleted accessory "${existingItem.name} – ${existingItem.type}"`,
          link,
          metadata: {
            itemId: existingItem.id,
            category: existingItem.name,
            type: existingItem.type,
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Accessory deleted',
          message: `${session.user.name || session.user.email} deleted accessory ${existingItem.name} – ${existingItem.type}.`,
          link,
          priority: 'MEDIUM',
          metadata: {
            domain: 'CUSTOM_ITEM',
            itemId: existingItem.id,
          },
        });
      }
    } catch (sideEffectError) {
      console.error('Custom item delete side effects failed:', sideEffectError);
    }

    return NextResponse.json({ message: 'Custom item deleted successfully' });
  } catch (error) {
    console.error('Failed to delete custom item:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom item' },
      { status: 500 }
    );
  }
}
