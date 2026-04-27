import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateUniqueCylinderCode } from '@/lib/cylinder-code-generator';
import { normalizeTypeName } from '@/lib/cylinder-utils';
import { logActivity, ActivityAction } from '@/lib/activityLogger';
import { notifyUserActivity, checkAndNotifyLowCylinderStock } from '@/lib/superAdminNotifier';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const location = searchParams.get('location') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where clause
    // Exclude WITH_CUSTOMER cylinders from main inventory - they are tracked on separate page
    const where: any = { ...regionScopedWhere(regionId) };

    // Build status condition
    let statusCondition: any;
    if (status && status !== 'ALL') {
      // If status filter is selected (and not "ALL"), use it (but never allow WITH_CUSTOMER)
      if (status === 'WITH_CUSTOMER') {
        // Don't allow filtering by WITH_CUSTOMER on this page - return empty results
        statusCondition = 'INVALID_STATUS_THAT_DOES_NOT_EXIST';
      } else {
        statusCondition = status;
      }
    } else {
      // No status filter or "ALL" selected - exclude WITH_CUSTOMER cylinders
      statusCondition = { not: 'WITH_CUSTOMER' };
    }

    // Build type filter condition first (before combining with other conditions)
    let typeFilterCondition: any = null;
    
    if (type && type !== 'ALL') {
      // Check if type is a display name (e.g., "Special (10kg)", "Standard (15kg)") or type string (e.g., "STANDARD_15KG")
      // If it contains parentheses, it's a display name - extract typeName and capacity
      if (type.includes('(') && type.includes('kg)')) {
          // Extract typeName and capacity from display name (e.g., "Special (10kg)" -> typeName: "Special", capacity: 10)
          const nameMatch = type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
          if (nameMatch) {
            const extractedTypeName = nameMatch[1].trim();
            const capacity = parseFloat(nameMatch[2]);
            
            // Filter by typeName + capacity combination - fully dynamic approach
            // This works for any type name and capacity, not just hardcoded ones
            typeFilterCondition = {
              typeName: extractedTypeName,
              capacity: capacity
            };
          } else {
            // Fallback: filter by cylinderType string
            typeFilterCondition = { cylinderType: type };
          }
      } else {
        // It's a type string (e.g., "STANDARD_15KG", "CYLINDER_10KG"), filter by cylinderType
        typeFilterCondition = { cylinderType: type };
      }
    }
    // If type is "ALL" or empty, don't add any type filter (show all types)

    // Build combined where clause with all conditions
    const allConditions: any[] = [];
    
    // Add status condition
    allConditions.push({ currentStatus: statusCondition });
    
    // Add type filter condition if exists
    if (typeFilterCondition) {
      allConditions.push(typeFilterCondition);
    }
    
    // Add search condition if exists
    if (search) {
      allConditions.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
    
    // Add location filter condition if exists
    if (location && location !== 'ALL') {
      if (location === 'STORE') {
        allConditions.push({ storeId: { not: null } });
      } else if (location === 'VEHICLE') {
        allConditions.push({ vehicleId: { not: null } });
      }
      // Note: CUSTOMER location filter is ignored here as WITH_CUSTOMER cylinders are excluded
    }
    
    // Combine all conditions with AND
    if (allConditions.length > 0) {
      where.AND = allConditions;
    } else {
      // Fallback: at least add status condition
      where.currentStatus = statusCondition;
    }

    // Region scoping is handled at the top-level `where` (regionScopedWhere) so
    // it applies regardless of which AND/OR branches are used.

    // Get cylinders with pagination
    const cylinders = await prisma.cylinder.findMany({
      where,
      include: {
        store: {
          select: {
            name: true
          }
        },
        vehicle: {
          select: {
            vehicleNumber: true,
            driverName: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get total count
    const total = await prisma.cylinder.count({ where });

    // Convert Decimal fields to numbers for JSON serialization
    const serializedCylinders = cylinders.map(cylinder => ({
      ...cylinder,
      capacity: parseFloat(cylinder.capacity.toString()),
      purchasePrice: cylinder.purchasePrice ? parseFloat(cylinder.purchasePrice.toString()) : null,
      typeName: cylinder.typeName || null
    }));

    return NextResponse.json({
      success: true,
      cylinders: serializedCylinders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cylinders' },
      { status: 500 }
    );
  }
}

// Code generation moved to shared utility: @/lib/cylinder-code-generator

export async function POST(request: NextRequest) {
  try {
    const regionId = getActiveRegionId(request);
    const body = await request.json();
    const { code, typeName, cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice } = body;

    // IMPORTANT: Normalize typeName to consistent case format before storing
    // This ensures "special", "Special", "SPECIAL" all become "Special"
    // This prevents duplicate cards in inventory dashboard
    const normalizedTypeName = normalizeTypeName(typeName) || null;

    // Use provided code or generate one based on type name
    let cylinderCode = code;
    if (!cylinderCode) {
      // Generate code based on normalized type name (isTypeName = true)
      const nameForCode = normalizedTypeName || 'Cylinder';
      cylinderCode = await generateUniqueCylinderCode(nameForCode, true);
    }

    // Check if code already exists
    const existingCylinder = await prisma.cylinder.findUnique({
      where: { code: cylinderCode }
    });

    if (existingCylinder) {
      return NextResponse.json(
        { success: false, error: 'Cylinder code already exists. Please use a different code.' },
        { status: 400 }
      );
    }

    // Store the cylinder type directly as a string (no enum validation needed)
    // The type is generated from capacity or mapped from known types
    // Store normalized typeName to ensure consistent grouping in stats
    const cylinder = await prisma.cylinder.create({
      data: {
        code: cylinderCode,
        cylinderType: cylinderType, // Store as string directly
        typeName: normalizedTypeName, // Store normalized type name for consistent grouping
        capacity: parseFloat(capacity),
        currentStatus: currentStatus || 'FULL',
        location,
        storeId: storeId || null,
        vehicleId: vehicleId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        ...(regionId ? { regionId } : {}),
      }
    });

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const friendly = normalizedTypeName || cylinder.cylinderType.replace(/_/g, ' ');
        const link = `/inventory/cylinders?type=${encodeURIComponent(cylinder.cylinderType)}`;
        await logActivity({
          userId: session.user.id,
          action: ActivityAction.CYLINDER_CREATED,
          entityType: 'CYLINDER',
          entityId: cylinder.id,
          details: `Added ${friendly} cylinder (${cylinder.code}) • Capacity: ${Number(cylinder.capacity)}kg • Status: ${cylinder.currentStatus}`,
          link,
          regionId,
          metadata: {
            cylinderId: cylinder.id,
            code: cylinder.code,
            cylinderType: cylinder.cylinderType,
            typeName: normalizedTypeName,
            capacity: Number(cylinder.capacity),
            currentStatus: cylinder.currentStatus,
          },
        });
        await notifyUserActivity({
          actorId: session.user.id,
          actorName: session.user.name || session.user.email || 'A user',
          title: 'Cylinder added to inventory',
          message: `${session.user.name || session.user.email} added ${friendly} cylinder ${cylinder.code} (${Number(cylinder.capacity)}kg).`,
          link,
          priority: 'LOW',
          regionId,
          metadata: {
            domain: 'CYLINDER',
            cylinderId: cylinder.id,
            code: cylinder.code,
            cylinderType: cylinder.cylinderType,
          },
        });
      }
      await checkAndNotifyLowCylinderStock(cylinder.cylinderType, regionId);
    } catch (sideEffectError) {
      console.error('Cylinder create side effects failed:', sideEffectError);
    }

    const response = {
      ...cylinder,
      typeName: typeName || null,
    };

    return NextResponse.json({
      success: true,
      cylinder: response
    });
  } catch (error: any) {
    console.error('Error creating cylinder:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('Invalid enum value')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid cylinder type. Please contact support if you need a new type added to the system.',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create cylinder' },
      { status: 500 }
    );
  }
}
