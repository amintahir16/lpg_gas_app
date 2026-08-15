import { Prisma } from '@prisma/client';
import type { PurchaseInventoryEffect } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

type JsonRecord = Record<string, unknown>;

function asRecord(value: Prisma.JsonValue | null | undefined): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : value == null ? null : String(value);
}

/**
 * Validates that every recorded inventory effect is still in the post-purchase state.
 * Throws an Error with a user-facing message when reversal is unsafe.
 */
export async function assertPurchaseEffectsReversible(
  tx: PrismaTx,
  effects: PurchaseInventoryEffect[],
): Promise<void> {
  for (const effect of effects) {
    const after = asRecord(effect.afterState);
    const before = asRecord(effect.beforeState);

    switch (effect.effectType) {
      case 'CYLINDER_STATUS_CHANGE': {
        if (!effect.entityId) {
          throw new Error('Missing cylinder reference for status-change effect');
        }
        const cylinder = await tx.cylinder.findUnique({ where: { id: effect.entityId } });
        if (!cylinder) {
          throw new Error(
            `Cannot undo: cylinder ${str(after?.code) || effect.entityId} no longer exists`,
          );
        }
        if (cylinder.currentStatus !== str(after?.currentStatus)) {
          throw new Error(
            `Cannot undo: cylinder ${cylinder.code} status changed from ${str(after?.currentStatus)} to ${cylinder.currentStatus}`,
          );
        }
        if (
          cylinder.location !== str(after?.location) ||
          cylinder.storeId !== str(after?.storeId) ||
          cylinder.vehicleId !== str(after?.vehicleId)
        ) {
          throw new Error(
            `Cannot undo: cylinder ${cylinder.code} was moved or reassigned after this purchase`,
          );
        }
        break;
      }

      case 'CYLINDER_CREATED': {
        if (!effect.entityId) {
          throw new Error('Missing cylinder reference for created-cylinder effect');
        }
        const cylinder = await tx.cylinder.findUnique({
          where: { id: effect.entityId },
          include: {
            cylinderRentals: { where: { status: 'ACTIVE' }, take: 1 },
            vendorInventories: { take: 1 },
          },
        });
        if (!cylinder) {
          throw new Error(
            `Cannot undo: cylinder ${str(after?.code) || effect.entityId} was deleted after this purchase`,
          );
        }
        if (cylinder.currentStatus !== str(after?.currentStatus)) {
          throw new Error(
            `Cannot undo: cylinder ${cylinder.code} status changed after this purchase`,
          );
        }
        if (
          cylinder.location !== str(after?.location) ||
          cylinder.storeId !== str(after?.storeId) ||
          cylinder.vehicleId !== str(after?.vehicleId)
        ) {
          throw new Error(
            `Cannot undo: cylinder ${cylinder.code} was moved or reassigned after this purchase`,
          );
        }
        if (cylinder.cylinderRentals.length > 0) {
          throw new Error(
            `Cannot undo: cylinder ${cylinder.code} is currently rented`,
          );
        }
        if (cylinder.vendorInventories.length > 0) {
          throw new Error(
            `Cannot undo: cylinder ${cylinder.code} is linked to vendor inventory`,
          );
        }
        break;
      }

      case 'CUSTOM_ITEM_UPDATED': {
        if (!effect.entityId) {
          throw new Error('Missing custom item reference for update effect');
        }
        const item = await tx.customItem.findUnique({ where: { id: effect.entityId } });
        if (!item) {
          throw new Error(
            `Cannot undo: inventory item "${effect.itemName || effect.entityId}" no longer exists`,
          );
        }
        if (item.quantity !== num(after?.quantity)) {
          throw new Error(
            `Cannot undo: inventory item "${item.type}" quantity changed after this purchase (${item.quantity} vs expected ${num(after?.quantity)})`,
          );
        }
        if (Number(item.costPerPiece) !== num(after?.costPerPiece)) {
          throw new Error(
            `Cannot undo: inventory item "${item.type}" cost was changed after this purchase`,
          );
        }
        break;
      }

      case 'CUSTOM_ITEM_CREATED': {
        if (!effect.entityId) {
          throw new Error('Missing custom item reference for create effect');
        }
        const item = await tx.customItem.findUnique({ where: { id: effect.entityId } });
        if (!item) {
          throw new Error(
            `Cannot undo: inventory item "${effect.itemName || effect.entityId}" was deleted after this purchase`,
          );
        }
        if (item.quantity !== num(after?.quantity)) {
          throw new Error(
            `Cannot undo: inventory item "${item.type}" quantity changed after this purchase`,
          );
        }
        break;
      }

      case 'PRODUCT_UPDATED': {
        if (!effect.entityId) {
          throw new Error('Missing product reference for update effect');
        }
        const product = await tx.product.findUnique({ where: { id: effect.entityId } });
        if (!product) {
          throw new Error(
            `Cannot undo: product "${effect.itemName || effect.entityId}" no longer exists`,
          );
        }
        if (Number(product.stockQuantity) !== num(after?.stockQuantity)) {
          throw new Error(
            `Cannot undo: product "${product.name}" stock changed after this purchase`,
          );
        }
        break;
      }

      case 'PRODUCT_CREATED': {
        if (!effect.entityId) {
          throw new Error('Missing product reference for create effect');
        }
        const product = await tx.product.findUnique({
          where: { id: effect.entityId },
          include: { b2b_transaction_items: { take: 1 } },
        });
        if (!product) {
          throw new Error(
            `Cannot undo: product "${effect.itemName || effect.entityId}" was deleted after this purchase`,
          );
        }
        if (Number(product.stockQuantity) !== num(after?.stockQuantity)) {
          throw new Error(
            `Cannot undo: product "${product.name}" stock changed after this purchase`,
          );
        }
        if (product.b2b_transaction_items.length > 0) {
          throw new Error(
            `Cannot undo: product "${product.name}" has already been used in sales`,
          );
        }
        break;
      }

      default:
        throw new Error(`Unsupported inventory effect type: ${effect.effectType}`);
    }

    // before may be unused for create effects; keep reference to avoid unused warnings in some builds
    void before;
  }
}

/**
 * Reverses previously validated inventory effects inside the caller's transaction.
 */
export async function reversePurchaseInventoryEffects(
  tx: PrismaTx,
  effects: PurchaseInventoryEffect[],
): Promise<void> {
  // Reverse in reverse chronological order for safer nested updates.
  const ordered = [...effects].reverse();

  for (const effect of ordered) {
    const before = asRecord(effect.beforeState);
    const after = asRecord(effect.afterState);

    switch (effect.effectType) {
      case 'CYLINDER_STATUS_CHANGE': {
        if (!effect.entityId || !before) {
          throw new Error('Cannot reverse cylinder status change: incomplete effect data');
        }
        await tx.cylinder.update({
          where: { id: effect.entityId },
          data: {
            currentStatus: str(before.currentStatus) as any,
            location: str(before.location),
            storeId: str(before.storeId),
            vehicleId: str(before.vehicleId),
          },
        });
        break;
      }

      case 'CYLINDER_CREATED': {
        if (!effect.entityId) {
          throw new Error('Cannot reverse cylinder create: missing entity id');
        }
        await tx.cylinder.delete({ where: { id: effect.entityId } });
        break;
      }

      case 'CUSTOM_ITEM_UPDATED': {
        if (!effect.entityId || !before) {
          throw new Error('Cannot reverse custom item update: incomplete effect data');
        }
        await tx.customItem.update({
          where: { id: effect.entityId },
          data: {
            quantity: num(before.quantity),
            costPerPiece: num(before.costPerPiece),
            totalCost: num(before.totalCost),
          },
        });
        break;
      }

      case 'CUSTOM_ITEM_CREATED': {
        if (!effect.entityId) {
          throw new Error('Cannot reverse custom item create: missing entity id');
        }
        await tx.customItem.delete({ where: { id: effect.entityId } });
        break;
      }

      case 'PRODUCT_UPDATED': {
        if (!effect.entityId || !before) {
          throw new Error('Cannot reverse product update: incomplete effect data');
        }
        await tx.product.update({
          where: { id: effect.entityId },
          data: {
            stockQuantity: num(before.stockQuantity),
          },
        });
        break;
      }

      case 'PRODUCT_CREATED': {
        if (!effect.entityId) {
          throw new Error('Cannot reverse product create: missing entity id');
        }
        await tx.product.delete({ where: { id: effect.entityId } });
        break;
      }

      default:
        throw new Error(`Unsupported inventory effect type: ${effect.effectType}`);
    }

    void after;
  }
}
