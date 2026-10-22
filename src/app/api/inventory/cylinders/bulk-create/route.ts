import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateCylinderCodeBatch } from '@/lib/cylinder-code-generator';
import { MAX_BULK_CYLINDER_QUANTITY, normalizeTypeName } from '@/lib/cylinder-utils';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity, checkAndNotifyLowCylinderStock } from '@/lib/superAdminNotifier';
import { getActiveRegionId } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';

const MAX_CODE_ATTEMPTS = 3;

/**
 * Add N identical cylinders in one request. Same validation and stored fields
 * as POST /api/inventory/cylinders; codes are generated as one sequential batch
 * and all rows are inserted together (all or nothing).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const { typeName, cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice } = body;
    const quantity = Number(body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BULK_CYLINDER_QUANTITY) {
      return NextResponse.json(
        { success: false, error: `Quantity must be a whole number between 1 and ${MAX_BULK_CYLINDER_QUANTITY}.` },
        { status: 400 }
      );
    }

    if (purchasePrice === undefined || purchasePrice === null || purchasePrice === '') {
      return NextResponse.json(
        { success: false, error: 'Purchase price is required.' },
        { status: 400 }
      );
    }
    const parsedPurchasePrice = parseFloat(purchasePrice);
    if (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Purchase price must be a valid number (0 or greater).' },
        { status: 400 }
      );
    }

    const normalizedTypeName = normalizeTypeName(typeName) || null;
    const nameForCode = normalizedTypeName || 'Cylinder';

    const baseData = {
      cylinderType: cylinderType,
      typeName: normalizedTypeName,
      capacity: parseFloat(capacity),
      currentStatus: currentStatus || 'FULL',
      location,
      storeId: storeId || null,
      vehicleId: vehicleId || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: parsedPurchasePrice,
      ...(regionId ? { regionId } : {}),
    };

    // Retry only when a concurrent add claimed one of the generated codes.
    // Codes come from one MAX() query (not loading every existing code). Insert is
    // a single createMany — not createManyAndReturn inside an interactive transaction.
    let codes: string[] = [];
    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
      try {
        codes = await generateCylinderCodeBatch(nameForCode, quantity, true);
        await prisma.cylinder.createMany({
          data: codes.map((code) => ({ ...baseData, code })),
        });
        break;
      } catch (error) {
        const isCodeConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!isCodeConflict || attempt === MAX_CODE_ATTEMPTS) throw error;
      }
    }

    const firstCode = codes[0];
    const lastCode = codes[codes.length - 1];
    const codeRange = codes.length > 1 ? `${firstCode} … ${lastCode}` : firstCode;
    const first = await prisma.cylinder.findUnique({
      where: { code: firstCode },
      select: { id: true, cylinderType: true, capacity: true, currentStatus: true },
    });
    if (!first) {
      throw new Error('Cylinders were inserted but could not be read back');
    }

    try {
      if (session?.user?.id) {
        const friendly = normalizedTypeName || first.cylinderType.replace(/_/g, ' ');
        const link = `/inventory/cylinders?type=${encodeURIComponent(first.cylinderType)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CYLINDER_CREATED,
          entityType: 'CYLINDER',
          entityId: first.id,
          details: `Added ${codes.length} ${friendly} cylinder(s) (${codeRange}) • Capacity: ${Number(first.capacity)}kg • Status: ${first.currentStatus}`,
          link,
          regionId,
          metadata: {
            bulk: true,
            quantity: codes.length,
            cylinderType: first.cylinderType,
            typeName: normalizedTypeName,
            capacity: Number(first.capacity),
            currentStatus: first.currentStatus,
            firstCode,
            lastCode,
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Cylinders added to inventory',
          message: `${session.user.name || session.user.email} added ${codes.length} ${friendly} cylinder(s) (${codeRange}, ${Number(first.capacity)}kg).`,
          link,
          priority: 'LOW',
          regionId,
          metadata: {
            domain: 'CYLINDER',
            bulk: true,
            quantity: codes.length,
            cylinderType: first.cylinderType,
          },
        });
      }
      await checkAndNotifyLowCylinderStock(first.cylinderType, regionId);
    } catch (sideEffectError) {
      console.error('Bulk cylinder create side effects failed:', sideEffectError);
    }

    return NextResponse.json({
      success: true,
      createdCount: codes.length,
      firstCode,
      lastCode,
    });
  } catch (error) {
    console.error('Error bulk creating cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add cylinders' },
      { status: 500 }
    );
  }
}
