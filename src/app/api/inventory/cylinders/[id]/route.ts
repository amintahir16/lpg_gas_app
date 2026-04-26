import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeTypeName } from '@/lib/cylinder-utils';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity, checkAndNotifyLowCylinderStock } from '@/lib/superAdminNotifier';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { typeName, cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice, lastMaintenanceDate, nextMaintenanceDate } = body;

    // IMPORTANT: Normalize typeName to consistent case format before storing
    // This ensures "special", "Special", "SPECIAL" all become "Special"
    // This prevents duplicate cards in inventory dashboard
    const normalizedTypeName = normalizeTypeName(typeName) || null;

    const previous = await prisma.cylinder.findUnique({ where: { id } });

    // Store the cylinder type directly as a string (no enum validation needed)
    const cylinder = await prisma.cylinder.update({
      where: {
        id
      },
      data: {
        typeName: normalizedTypeName, // Store normalized type name for consistent grouping
        cylinderType: cylinderType, // Store as string directly
        capacity: parseFloat(capacity),
        currentStatus,
        location,
        storeId: storeId || null,
        vehicleId: vehicleId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null
      }
    });

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const friendly = cylinder.typeName || cylinder.cylinderType.replace(/_/g, ' ');
        const link = `/inventory/cylinders?type=${encodeURIComponent(cylinder.cylinderType)}`;
        const statusChanged = previous && previous.currentStatus !== cylinder.currentStatus;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CYLINDER_UPDATED,
          entityType: 'CYLINDER',
          entityId: cylinder.id,
          details: `Updated ${friendly} cylinder (${cylinder.code})${statusChanged ? ` • Status: ${previous?.currentStatus} → ${cylinder.currentStatus}` : ''}`,
          link,
          metadata: {
            cylinderId: cylinder.id,
            code: cylinder.code,
            cylinderType: cylinder.cylinderType,
            statusChanged,
            previousStatus: previous?.currentStatus,
            currentStatus: cylinder.currentStatus,
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Cylinder updated',
          message: `${session.user.name || session.user.email} updated cylinder ${cylinder.code}${statusChanged ? ` (status → ${cylinder.currentStatus})` : ''}.`,
          link,
          priority: 'LOW',
          metadata: {
            domain: 'CYLINDER',
            cylinderId: cylinder.id,
            code: cylinder.code,
          },
        });
      }
      await checkAndNotifyLowCylinderStock(cylinder.cylinderType);
      if (previous && previous.cylinderType !== cylinder.cylinderType) {
        await checkAndNotifyLowCylinderStock(previous.cylinderType);
      }
    } catch (sideEffectError) {
      console.error('Cylinder update side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      success: true,
      cylinder
    });
  } catch (error) {
    console.error('Error updating cylinder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cylinder' },
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
    
    // Check if cylinder exists and is empty
    const cylinder = await prisma.cylinder.findUnique({
      where: { id }
    });

    if (!cylinder) {
      return NextResponse.json(
        { success: false, error: 'Cylinder not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of empty cylinders
    if (cylinder.currentStatus !== 'EMPTY') {
      return NextResponse.json(
        { success: false, error: 'Only empty cylinders can be deleted' },
        { status: 400 }
      );
    }

    await prisma.cylinder.delete({
      where: {
        id
      }
    });

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const friendly = cylinder.typeName || cylinder.cylinderType.replace(/_/g, ' ');
        const link = `/inventory/cylinders?type=${encodeURIComponent(cylinder.cylinderType)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CYLINDER_DELETED,
          entityType: 'CYLINDER',
          entityId: cylinder.id,
          details: `Deleted ${friendly} cylinder (${cylinder.code})`,
          link,
          metadata: {
            cylinderId: cylinder.id,
            code: cylinder.code,
            cylinderType: cylinder.cylinderType,
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Cylinder deleted',
          message: `${session.user.name || session.user.email} deleted cylinder ${cylinder.code} (${friendly}).`,
          link,
          priority: 'MEDIUM',
          metadata: {
            domain: 'CYLINDER',
            cylinderId: cylinder.id,
            code: cylinder.code,
          },
        });
      }
      await checkAndNotifyLowCylinderStock(cylinder.cylinderType);
    } catch (sideEffectError) {
      console.error('Cylinder delete side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting cylinder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete cylinder' },
      { status: 500 }
    );
  }
}
