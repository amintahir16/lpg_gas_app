import { prisma } from '@/lib/prisma';
import { CylinderType, CylinderStatus } from '@prisma/client';

export interface InventoryCheck {
  cylinderType: string;
  requested: number;
  available: number;
  isValid: boolean;
}

/**
 * Check if requested quantity exceeds available inventory
 */
export async function checkCylinderInventory(cylinderType: string, requested: number): Promise<InventoryCheck> {
  // Always check inventory, even when requested is 0 (for stock information)

  // Map string cylinder type to enum
  let mappedCylinderType: CylinderType;
  switch (cylinderType) {
    case 'DOMESTIC_11_8KG':
      mappedCylinderType = CylinderType.DOMESTIC_11_8KG;
      break;
    case 'STANDARD_15KG':
      mappedCylinderType = CylinderType.STANDARD_15KG;
      break;
    case 'COMMERCIAL_45_4KG':
      mappedCylinderType = CylinderType.COMMERCIAL_45_4KG;
      break;
    default:
      return { cylinderType, requested, available: 0, isValid: false };
  }

  try {
    // Get available cylinders
    const availableCylinders = await prisma.cylinder.findMany({
      where: {
        cylinderType: mappedCylinderType,
        currentStatus: CylinderStatus.FULL
      }
    });

    const available = availableCylinders.length;
    // If requested is 0, we're just getting stock info, so always valid
    const isValid = requested <= 0 ? true : available >= requested;

    return { cylinderType, requested, available, isValid };
  } catch (error) {
    console.error('Error checking cylinder inventory:', error);
    return { cylinderType, requested, available: 0, isValid: false };
  }
}

/**
 * Check accessory inventory
 */
export async function checkAccessoryInventory(itemName: string, itemType: string, quality: string, requested: number): Promise<InventoryCheck> {
  if (requested <= 0) {
    return { cylinderType: itemName, requested, available: 0, isValid: true };
  }

  try {
    let available = 0;

    switch (itemType) {
      case 'stove':
        const stove = await prisma.stove.findFirst({
          where: { quality: quality || 'Standard' }
        });
        available = stove ? Number(stove.quantity) : 0;
        break;

      case 'regulator':
        const regulator = await prisma.regulator.findFirst({
          where: { type: itemName }
        });
        available = regulator ? Number(regulator.quantity) : 0;
        break;

      case 'gasPipe':
        const gasPipe = await prisma.gasPipe.findFirst({
          where: { type: itemName }
        });
        available = gasPipe ? Number(gasPipe.quantity) : 0;
        break;

      case 'product':
        const product = await prisma.product.findFirst({
          where: {
            name: { contains: itemName, mode: 'insensitive' }
          }
        });
        available = product ? Number(product.stockQuantity) : 0;
        break;
    }

    const isValid = available >= requested;
    return { cylinderType: itemName, requested, available, isValid };
  } catch (error) {
    console.error('Error checking accessory inventory:', error);
    return { cylinderType: itemName, requested, available: 0, isValid: false };
  }
}
