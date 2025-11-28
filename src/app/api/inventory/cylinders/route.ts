import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const location = searchParams.get('location') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build where clause
    // Exclude WITH_CUSTOMER cylinders from main inventory - they are tracked on separate page
    const where: any = {};

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
          
          // Map standard display names to their enum values for filtering
          let mappedCylinderType: string | null = null;
          const typeNameLower = extractedTypeName.toLowerCase();
          
          if (typeNameLower.includes('domestic') && Math.abs(capacity - 11.8) < 0.1) {
            mappedCylinderType = 'DOMESTIC_11_8KG';
          } else if (typeNameLower.includes('standard') && Math.abs(capacity - 15.0) < 0.1) {
            mappedCylinderType = 'STANDARD_15KG';
          } else if (typeNameLower.includes('commercial') && Math.abs(capacity - 45.4) < 0.1) {
            mappedCylinderType = 'COMMERCIAL_45_4KG';
          } else if (Math.abs(capacity - 6.0) < 0.1) {
            mappedCylinderType = 'CYLINDER_6KG';
          } else if (Math.abs(capacity - 30.0) < 0.1) {
            mappedCylinderType = 'CYLINDER_30KG';
          }
          
          // For standard types, match by cylinderType + capacity (typeName might be null or different)
          // For custom types, match by typeName + capacity
          if (mappedCylinderType) {
            // Standard type - match by cylinderType and capacity (works for both typeName=null and typeName=extractedTypeName)
            typeFilterCondition = {
              cylinderType: mappedCylinderType,
              capacity: capacity
            };
          } else {
            // Custom type - filter by typeName and capacity
            typeFilterCondition = {
              typeName: extractedTypeName,
              capacity: capacity
            };
          }
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

/**
 * Generate prefix from cylinder type name
 * Domestic -> DM, Standard -> ST, Custom names -> First two letters
 */
function getCylinderCodePrefix(typeName: string): string {
  const name = typeName.trim().toLowerCase();
  
  // Handle known types
  if (name.includes('domestic')) {
    return 'DM';
  } else if (name.includes('standard')) {
    return 'ST';
  } else if (name.includes('commercial')) {
    return 'CM';
  } else {
    // For custom names, use first two letters (uppercase)
    const firstTwo = typeName.trim().substring(0, 2).toUpperCase();
    // If only one character, pad with X
    return firstTwo.length === 1 ? `${firstTwo}X` : firstTwo;
  }
}

/**
 * Generate unique cylinder code based on type name prefix
 */
async function generateUniqueCylinderCode(typeName: string): Promise<string> {
  const prefix = getCylinderCodePrefix(typeName);
  
  // Find all existing cylinders with this prefix
  const existingCylinders = await prisma.cylinder.findMany({
    where: {
      code: {
        startsWith: prefix
      }
    },
    select: {
      code: true
    },
    orderBy: {
      code: 'desc'
    }
  });
  
  // Extract numbers from existing codes and find the highest
  let maxNumber = 0;
  existingCylinders.forEach(cylinder => {
    // Match patterns like DM-0001, ST-0001, DM0001, ST0001
    // Handle both with and without dashes
    const match = cylinder.code.match(new RegExp(`^${prefix}[-]?(\\d+)(?:-\\d+)?$`));
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });
  
  // Generate the next sequential number
  const nextNumber = maxNumber + 1;
  const cylinderCode = `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  
  // Double-check that this code doesn't exist (safety check)
  const existingCylinder = await prisma.cylinder.findUnique({
    where: { code: cylinderCode }
  });
  
  if (existingCylinder) {
    // If somehow it exists, add a timestamp to make it unique
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${nextNumber.toString().padStart(4, '0')}-${timestamp}`;
  }
  
  return cylinderCode;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, typeName, cylinderType, capacity, currentStatus, location, storeId, vehicleId, purchaseDate, purchasePrice } = body;

    // Use provided code or generate one based on type name
    let cylinderCode = code;
    if (!cylinderCode) {
      // Generate code based on type name
      const nameForCode = typeName || 'Cylinder';
      cylinderCode = await generateUniqueCylinderCode(nameForCode);
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
    const cylinder = await prisma.cylinder.create({
      data: {
        code: cylinderCode,
        cylinderType: cylinderType, // Store as string directly
        typeName: typeName || null, // Store original type name for display
        capacity: parseFloat(capacity),
        currentStatus: currentStatus || 'FULL',
        location,
        storeId: storeId || null,
        vehicleId: vehicleId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null
      }
    });

    // Return the cylinder with original typeName for display purposes
    // Store typeName in a way that can be retrieved later (we'll use the location field or add a note)
    // For now, return the cylinder with the actual capacity which will be used for display
    const response = {
      ...cylinder,
      // Include typeName if provided for reference (though it's not stored in DB)
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
        { success: false, error: `Invalid cylinder type. Please contact support to add "${body.cylinderType}" to the system.` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create cylinder' },
      { status: 500 }
    );
  }
}
