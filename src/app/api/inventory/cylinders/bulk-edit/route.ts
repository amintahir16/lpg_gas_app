import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity } from '@/lib/superAdminNotifier';
import {
  buildPrismaCylinderVariantWhere,
  parseCylinderVariantKey,
} from '@/lib/cylinder-variant-key';

const SELECTABLE_STATUSES = new Set(['FULL', 'EMPTY', 'WITH_CUSTOMER']);
const NEW_STATUSES = new Set(['FULL', 'EMPTY']);

/**
 * SUPER_ADMIN only — update N cylinders by variant + current status.
 * Editable fields: newStatus, purchasePrice, location, purchaseDate (only provided fields change).
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
    const newStatusRaw =
      typeof body.newStatus === 'string' ? body.newStatus.trim().toUpperCase() : '';
    const quantity = Number(body.quantity);

    const hasNewStatus = newStatusRaw !== '';
    const hasPurchasePrice =
      body.purchasePrice !== undefined &&
      body.purchasePrice !== null &&
      String(body.purchasePrice).trim() !== '';
    const hasLocation =
      typeof body.location === 'string' && body.location.trim() !== '';
    const hasPurchaseDate =
      typeof body.purchaseDate === 'string' && body.purchaseDate.trim() !== '';

    if (!variantKey && !type) {
      return NextResponse.json(
        { success: false, error: 'Cylinder type (variantKey) is required.' },
        { status: 400 }
      );
    }
    if (!SELECTABLE_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: 'Current status must be FULL, EMPTY, or WITH_CUSTOMER.' },
        { status: 400 }
      );
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a whole number between 1 and 1000.' },
        { status: 400 }
      );
    }
    if (hasNewStatus && !NEW_STATUSES.has(newStatusRaw)) {
      return NextResponse.json(
        { success: false, error: 'New status must be FULL or EMPTY.' },
        { status: 400 }
      );
    }
    if (hasNewStatus && status === 'WITH_CUSTOMER') {
      return NextResponse.json(
        {
          success: false,
          error:
            'With-customer cylinder status cannot be changed here. Return the cylinder through a transaction to change its status.',
        },
        { status: 400 }
      );
    }
    if (hasLocation && status === 'WITH_CUSTOMER') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Location of with-customer cylinders cannot be changed here. Return the cylinder through a transaction first.',
        },
        { status: 400 }
      );
    }
    if (hasNewStatus && newStatusRaw === status) {
      return NextResponse.json(
        { success: false, error: 'New status must be different from current status.' },
        { status: 400 }
      );
    }
    if (!hasNewStatus && !hasPurchasePrice && !hasLocation && !hasPurchaseDate) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Provide at least one field to update: new status, purchase price, location, or purchase date.',
        },
        { status: 400 }
      );
    }

    const data: {
      currentStatus?: string;
      purchasePrice?: number;
      location?: string;
      purchaseDate?: Date;
    } = {};

    if (hasNewStatus) {
      data.currentStatus = newStatusRaw;
    }
    if (hasPurchasePrice) {
      const parsedPurchasePrice = parseFloat(String(body.purchasePrice));
      if (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0) {
        return NextResponse.json(
          { success: false, error: 'Purchase price must be a valid number (0 or greater).' },
          { status: 400 }
        );
      }
      data.purchasePrice = parsedPurchasePrice;
    }
    if (hasLocation) {
      data.location = String(body.location).trim();
    }
    if (hasPurchaseDate) {
      const parsedDate = new Date(body.purchaseDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Purchase date is invalid.' },
          { status: 400 }
        );
      }
      data.purchaseDate = parsedDate;
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
          error: `No ${status.replace('_', ' ').toLowerCase()} cylinders available for ${typeLabelForMessages}.`,
        },
        { status: 404 }
      );
    }

    if (candidates.length < quantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${candidates.length} ${status.replace('_', ' ').toLowerCase()} cylinder(s) available for this type. Requested ${quantity}.`,
          available: candidates.length,
        },
        { status: 400 }
      );
    }

    const ids = candidates.map((c) => c.id);
    await prisma.cylinder.updateMany({
      where: {
        id: { in: ids },
        ...regionScopedWhere(regionId),
        currentStatus: status,
      },
      data,
    });

    const sampleType = candidates[0].typeName || candidates[0].cylinderType.replace(/_/g, ' ');
    const codesPreview = candidates
      .slice(0, 5)
      .map((c) => c.code)
      .join(', ');
    const more = candidates.length > 5 ? ` (+${candidates.length - 5} more)` : '';
    const changedFields = [
      hasNewStatus ? `status=${status}→${newStatusRaw}` : null,
      hasPurchasePrice ? `price=${data.purchasePrice}` : null,
      hasLocation ? `location=${data.location}` : null,
      hasPurchaseDate ? `purchaseDate=${body.purchaseDate}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      if (session?.user?.id) {
        const link = `/inventory/cylinders?type=${encodeURIComponent(candidates[0].cylinderType)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CYLINDER_UPDATED,
          entityType: 'CYLINDER',
          entityId: ids[0],
          details: `Bulk updated ${candidates.length} ${status} ${sampleType} cylinder(s) (${changedFields}): ${codesPreview}${more}`,
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
            changes: data,
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Cylinders updated',
          message: `${session.user.name || session.user.email} bulk-updated ${candidates.length} ${status.replace('_', ' ').toLowerCase()} ${sampleType} cylinder(s).`,
          link,
          priority: 'LOW',
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
    } catch (sideEffectError) {
      console.error('Bulk cylinder edit side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      success: true,
      updatedCount: candidates.length,
      codes: candidates.map((c) => c.code),
    });
  } catch (error) {
    console.error('Error bulk editing cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cylinders' },
      { status: 500 }
    );
  }
}
