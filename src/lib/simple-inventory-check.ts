import { prisma } from '@/lib/prisma';
import { CylinderStatus } from '@prisma/client';
import { regionScopedWhere } from '@/lib/region';
import { buildPrismaCylinderVariantWhere } from '@/lib/cylinder-variant-key';

export interface InventoryCheck {
  cylinderType: string;
  requested: number;
  available: number;
  isValid: boolean;
}

/**
 * Check if requested quantity exceeds available inventory
 */
export async function checkCylinderInventory(
  cylinderType: string,
  requested: number,
  regionId?: string | null,
  cylinderVariantKey?: string | null,
): Promise<InventoryCheck> {
  const echoKey = cylinderVariantKey?.trim()
    ? cylinderVariantKey!.trim()
    : cylinderType;

  try {
    const variantWhere = buildPrismaCylinderVariantWhere(cylinderType, cylinderVariantKey);
    const availableCylinders = await prisma.cylinder.findMany({
      where: {
        ...variantWhere,
        currentStatus: CylinderStatus.FULL,
        ...regionScopedWhere(regionId ?? null),
      },
    });

    const available = availableCylinders.length;
    const isValid = requested <= 0 ? true : available >= requested;

    return { cylinderType: echoKey, requested, available, isValid };
  } catch (error) {
    console.error('Error checking cylinder inventory:', error);
    return { cylinderType: echoKey, requested, available: 0, isValid: false };
  }
}

/**
 * Check accessory inventory
 */
export async function checkAccessoryInventory(
  itemName: string,
  itemType: string,
  quality: string,
  requested: number,
  regionId?: string | null,
): Promise<InventoryCheck> {
  if (requested <= 0) {
    return { cylinderType: itemName, requested, available: 0, isValid: true };
  }

  try {
    let available = 0;

    switch (itemType) {
      case 'valve':
        const valve = await prisma.customItem.findFirst({
          where: {
            name: 'Valves',
            type: itemName,
            ...regionScopedWhere(regionId ?? null),
          }
        });
        available = valve ? Number(valve.quantity) : 0;
        break;

      case 'product':
        const product = await prisma.product.findFirst({
          where: {
            name: { contains: itemName, mode: 'insensitive' },
            ...regionScopedWhere(regionId ?? null),
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
