import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity, checkAndNotifyLowCylinderStock } from '@/lib/superAdminNotifier';
import {
  buildPrismaCylinderVariantWhere,
  parseCylinderVariantKey,
} from '@/lib/cylinder-variant-key';

const INVENTORY_STATUSES = new Set(['FULL', 'EMPTY']);

/**
 * SUPER_ADMIN only — remove N inventory cylinders by variant + status.
 * Prefer variantKey (unique). Display-name `type` is fallback only.
 * Never deletes WITH_CUSTOMER (assigned) cylinders.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const variantKey = typeof body.variantKey === 'string' ? body.variantKey.trim() : '';
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';
    const quantity = Number(body.quantity);

    if (!variantKey && !type) {
      return NextResponse.json(
        { success: false, error: 'Cylinder type (variantKey) is required.' },
        { status: 400 }
      );
    }
    if (!INVENTORY_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be FULL or EMPTY (inventory only, not with customers).' },
        { status: 400 }
      );
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a whole number between 1 and 1000.' },
        { status: 400 }
      );
    }

    let typeFilterCondition: Record<string, unknown>;
    let typeLabelForMessages = type || variantKey;

    const parsedVariant = variantKey ? parseCylinderVariantKey(variantKey) : null;
    if (parsedVariant) {
      typeFilterCondition = buildPrismaCylinderVariantWhere(
        parsedVariant.cylinderType,
        variantKey
      );
      typeLabelForMessages =
        type ||
        `${parsedVariant.normalizedTypeNameLower || parsedVariant.cylinderType}${
          parsedVariant.capacity != null ? ` (${parsedVariant.capacity}kg)` : ''
        }`;
    } else if (type.includes('(') && type.includes('kg)')) {
      // Legacy fallback: display name (kept for compatibility)
      const nameMatch = type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
      if (!nameMatch) {
        return NextResponse.json({ success: false, error: 'Invalid cylinder type.' }, { status: 400 });
      }
      const extractedTypeName = nameMatch[1].trim();
      const capacity = parseFloat(nameMatch[2]);
      typeFilterCondition = {
        typeName: { equals: extractedTypeName, mode: 'insensitive' },
        capacity,
      };
      typeLabelForMessages = type;
    } else if (type) {
      typeFilterCondition = { cylinderType: type };
      typeLabelForMessages = type;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid cylinder type variant.' },
        { status: 400 }
      );
    }

    const candidates = await prisma.cylinder.findMany({
      where: {
        ...regionScopedWhere(regionId),
        currentStatus: status,
        ...typeFilterCondition,
      },
      orderBy: [{ createdAt: 'asc' }, { code: 'asc' }],
      take: quantity,
      select: {
        id: true,
        code: true,
        cylinderType: true,
        typeName: true,
        capacity: true,
        currentStatus: true,
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No ${status.toLowerCase()} cylinders available for ${typeLabelForMessages} in inventory.`,
        },
        { status: 404 }
      );
    }

    if (candidates.length < quantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${candidates.length} ${status.toLowerCase()} cylinder(s) available for this type. Requested ${quantity}.`,
          available: candidates.length,
        },
        { status: 400 }
      );
    }

    const ids = candidates.map((c) => c.id);
    await prisma.cylinder.deleteMany({
      where: {
        id: { in: ids },
        ...regionScopedWhere(regionId),
        currentStatus: status,
      },
    });

    const sampleType = candidates[0].typeName || candidates[0].cylinderType.replace(/_/g, ' ');
    const codesPreview = candidates
      .slice(0, 5)
      .map((c) => c.code)
      .join(', ');
    const more = candidates.length > 5 ? ` (+${candidates.length - 5} more)` : '';

    try {
      if (session?.user?.id) {
        const link = `/inventory/cylinders?type=${encodeURIComponent(candidates[0].cylinderType)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CYLINDER_DELETED,
          entityType: 'CYLINDER',
          entityId: ids[0],
          details: `Bulk deleted ${candidates.length} ${status} ${sampleType} cylinder(s): ${codesPreview}${more}`,
          link,
          regionId,
          metadata: {
            bulk: true,
            quantity: candidates.length,
            status,
            type: typeLabelForMessages,
            variantKey: variantKey || null,
            cylinderType: candidates[0].cylinderType,
            codes: candidates.map((c) => c.code),
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Cylinders removed',
          message: `${session.user.name || session.user.email} removed ${candidates.length} ${status.toLowerCase()} ${sampleType} cylinder(s) from inventory.`,
          link,
          priority: 'MEDIUM',
          regionId,
          metadata: {
            domain: 'CYLINDER',
            bulk: true,
            quantity: candidates.length,
            status,
            variantKey: variantKey || null,
          },
        });
      }
      await checkAndNotifyLowCylinderStock(candidates[0].cylinderType, regionId);
    } catch (sideEffectError) {
      console.error('Bulk cylinder delete side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      success: true,
      deletedCount: candidates.length,
      codes: candidates.map((c) => c.code),
    });
  } catch (error) {
    console.error('Error bulk deleting cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete cylinders' },
      { status: 500 }
    );
  }
}
