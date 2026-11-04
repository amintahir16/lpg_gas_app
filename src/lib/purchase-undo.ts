import { Prisma } from '@prisma/client';
import type { PurchaseInventoryEffect } from '@prisma/client';
import { generateCylinderTypeFromCapacity, normalizeTypeName } from './cylinder-utils';
import { buildCylinderVariantKey, buildPrismaCylinderVariantWhere } from '@/lib/cylinder-variant-key';
import { regionScopedWhere } from './region';

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

export type CylinderSubstitution = {
  originalCylinderId: string;
  originalCode: string;
  originalStatus: string;
  substituteCylinderId: string;
  substituteCode: string;
};

export interface PurchaseReversalPlan {
  substitutions: CylinderSubstitution[];
}

type DriftedGasFill = {
  id: string;
  code: string;
  currentStatus: string;
  cylinderType: string;
  typeName: string | null;
  capacity: Prisma.Decimal | number;
  regionId: string | null;
  /** When the original row is gone, match substitutes the same way the fill did (type aliases). */
  typeAliases?: string[];
};

function isGasFillEffect(before: JsonRecord | null, after: JsonRecord | null): boolean {
  return str(before?.currentStatus) === 'EMPTY' && str(after?.currentStatus) === 'FULL';
}

function parseGasItemVariant(itemName: string | null | undefined): {
  capacity: number;
  typeName: string | null;
  candidates: string[];
} | null {
  if (!itemName?.trim()) return null;
  const itemNameLower = itemName.toLowerCase();
  const weightMatch = itemNameLower.match(/(\d+\.?\d*)\s*kg/i);
  if (!weightMatch) return null;
  const capacity = parseFloat(weightMatch[1]);
  if (!Number.isFinite(capacity) || capacity <= 0) return null;

  const m = itemName.match(/^\s*([^\d(]+?)\s*(?:\(|\b)\s*(\d+(?:\.\d+)?)\s*kg/i);
  const rawTypeName = m?.[1]?.trim() || '';
  const normalizedTypeName = normalizeTypeName(rawTypeName);
  const typeName =
    normalizedTypeName && !/cylinder|gas/i.test(normalizedTypeName) ? normalizedTypeName : null;
  const generatedType = generateCylinderTypeFromCapacity(capacity);
  const candidates: string[] = [];
  if (Math.abs(capacity - 11.8) < 0.11 || itemNameLower.includes('domestic')) {
    candidates.push('DOMESTIC_11_8KG', generatedType);
  } else if (Math.abs(capacity - 15) < 0.11 || itemNameLower.includes('standard')) {
    candidates.push('STANDARD_15KG', generatedType);
  } else if (Math.abs(capacity - 45.4) < 0.11 || itemNameLower.includes('commercial')) {
    candidates.push('COMMERCIAL_45_4KG', generatedType);
  } else {
    candidates.push(generatedType);
  }

  return {
    capacity,
    typeName,
    candidates: Array.from(new Set(candidates.filter(Boolean))),
  };
}

function reconstructDeletedGasFill(
  effect: PurchaseInventoryEffect,
  before: JsonRecord | null,
  after: JsonRecord | null,
  fallbackRegionId?: string | null,
): DriftedGasFill {
  const parsed = parseGasItemVariant(effect.itemName);
  const snapshotType = str(after?.cylinderType) || str(before?.cylinderType);
  const snapshotTypeName = str(after?.typeName) ?? str(before?.typeName);
  const snapshotCapacity = num(after?.capacity, Number.NaN);
  const snapshotRegion = str(after?.regionId) ?? str(before?.regionId);
  const capacity =
    Number.isFinite(snapshotCapacity) && snapshotCapacity > 0
      ? snapshotCapacity
      : parsed?.capacity;
  const code = str(after?.code) || str(before?.code) || effect.entityId || 'unknown';

  if (!capacity) {
    throw new Error(
      `Cannot undo: cylinder ${code} no longer exists, and its type cannot be determined to reverse the fill on another cylinder.`,
    );
  }

  const candidates = parsed?.candidates?.length ? parsed.candidates : snapshotType ? [snapshotType] : [];
  const cylinderType = snapshotType || candidates[0];
  if (!cylinderType) {
    throw new Error(
      `Cannot undo: cylinder ${code} no longer exists, and its type cannot be determined to reverse the fill on another cylinder.`,
    );
  }

  return {
    id: effect.entityId || code,
    code,
    currentStatus: 'DELETED',
    cylinderType,
    typeName: snapshotTypeName ?? parsed?.typeName ?? null,
    capacity,
    regionId: snapshotRegion ?? fallbackRegionId ?? null,
    typeAliases: snapshotType ? undefined : candidates,
  };
}

function driftedGasFillGroupKey(cylinder: DriftedGasFill): string {
  if (cylinder.typeAliases && cylinder.typeAliases.length > 0) {
    return `alias#${cylinder.regionId ?? ''}#${cylinder.typeName ?? ''}#${Number(cylinder.capacity)}#${[...cylinder.typeAliases].sort().join(',')}`;
  }
  return `${cylinder.regionId ?? ''}#${buildCylinderVariantKey({
    cylinderType: cylinder.cylinderType,
    typeName: cylinder.typeName,
    capacity: Number(cylinder.capacity),
  })}`;
}

function driftedGasFillWhere(sample: DriftedGasFill, capacity: number): Prisma.CylinderWhereInput {
  const variantWhere: Prisma.CylinderWhereInput =
    sample.typeAliases && sample.typeAliases.length > 0
      ? {
          OR: sample.typeAliases.map((ct) =>
            buildPrismaCylinderVariantWhere(
              ct,
              buildCylinderVariantKey({
                cylinderType: ct,
                typeName: sample.typeName,
                capacity,
              }),
            ) as Prisma.CylinderWhereInput,
          ),
        }
      : {
          ...(buildPrismaCylinderVariantWhere(
            sample.cylinderType,
            buildCylinderVariantKey({
              cylinderType: sample.cylinderType,
              typeName: sample.typeName,
              capacity,
            }),
          ) as Prisma.CylinderWhereInput),
          ...(sample.typeName?.trim() ? {} : { typeName: null }),
        };

  return {
    ...variantWhere,
    regionId: sample.regionId,
    currentStatus: 'FULL',
    heldByCustomerId: null,
    cylinderRentals: { none: { status: 'ACTIVE' } },
  };
}

/**
 * Gas fills only flip EMPTY → FULL on whichever empties were picked, so cylinders of the
 * same variant are interchangeable. When a filled cylinder has since been sold, moved,
 * or deleted, another FULL in-stock cylinder of the same variant/region is reverted instead.
 * Customer-held and rented cylinders are never touched.
 */
function sameGasFillFamily(a: DriftedGasFill, b: DriftedGasFill): boolean {
  if ((a.regionId ?? null) !== (b.regionId ?? null)) return false;
  if (Number(a.capacity) !== Number(b.capacity)) return false;
  const aTypes = new Set([a.cylinderType, ...(a.typeAliases || [])]);
  const bTypes = new Set([b.cylinderType, ...(b.typeAliases || [])]);
  for (const type of aTypes) {
    if (bTypes.has(type)) return true;
  }
  const aName = (a.typeName || '').trim().toLowerCase();
  const bName = (b.typeName || '').trim().toLowerCase();
  return aName.length > 0 && aName === bName;
}

function gasFillStockLabel(sample: DriftedGasFill, capacity: number): string {
  return `${sample.typeName?.trim() || sample.cylinderType.replace(/_/g, ' ')} (${capacity}kg)`;
}

async function planGasFillSubstitutions(
  tx: PrismaTx,
  drifted: DriftedGasFill[],
  excludedIds: Set<string>,
  exactGasFills: DriftedGasFill[] = [],
): Promise<CylinderSubstitution[]> {
  const groups = new Map<string, DriftedGasFill[]>();
  for (const cylinder of drifted) {
    const key = driftedGasFillGroupKey(cylinder);
    const list = groups.get(key) ?? [];
    list.push(cylinder);
    groups.set(key, list);
  }

  const substitutions: CylinderSubstitution[] = [];
  for (const originals of groups.values()) {
    const sample = originals[0];
    const capacity = Number(sample.capacity);
    const baseWhere = driftedGasFillWhere(sample, capacity);

    const needed = originals.length;
    const picked: Array<{ id: string; code: string }> = [];
    // Store stock first; FULL cylinders loaded on vehicles only if the store runs short.
    for (const vehicleFilter of [{ vehicleId: null }, { vehicleId: { not: null } }]) {
      if (picked.length >= needed) break;
      const rows = await tx.cylinder.findMany({
        where: {
          ...baseWhere,
          ...vehicleFilter,
          id: { notIn: [...excludedIds, ...picked.map((p) => p.id)] },
        },
        orderBy: [{ createdAt: 'asc' }, { code: 'asc' }],
        take: needed - picked.length,
        select: { id: true, code: true },
      });
      picked.push(...rows);
    }

    if (picked.length < needed) {
      const label = gasFillStockLabel(sample, capacity);
      const purchaseQty =
        originals.length + exactGasFills.filter((fill) => sameGasFillFamily(sample, fill)).length;
      const availableFull = await tx.cylinder.count({ where: baseWhere });
      throw new Error(
        `Cannot undo: this purchase filled ${purchaseQty} × ${label}, but only ${availableFull} FULL ${label} cylinder(s) are in stock. Need ${purchaseQty} FULL of this type and capacity to reverse the fill. Undo the related sales first.`,
      );
    }

    originals.forEach((original, i) => {
      const substitute = picked[i];
      excludedIds.add(substitute.id);
      substitutions.push({
        originalCylinderId: original.id,
        originalCode: original.code,
        originalStatus: original.currentStatus,
        substituteCylinderId: substitute.id,
        substituteCode: substitute.code,
      });
    });
  }

  return substitutions;
}

/**
 * Validates that every recorded inventory effect can be reversed and returns the plan
 * (including any gas-fill substitutions) that `reversePurchaseInventoryEffects` must apply.
 * Throws an Error with a user-facing message when reversal is unsafe.
 */
export async function assertPurchaseEffectsReversible(
  tx: PrismaTx,
  effects: PurchaseInventoryEffect[],
  options?: { regionId?: string | null },
): Promise<PurchaseReversalPlan> {
  const driftedGasFills: DriftedGasFill[] = [];
  const exactGasFills: DriftedGasFill[] = [];
  const exactCylinderIds = new Set<string>();

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
          if (isGasFillEffect(before, after)) {
            driftedGasFills.push(
              reconstructDeletedGasFill(effect, before, after, options?.regionId),
            );
            break;
          }
          throw new Error(
            `Cannot undo: cylinder ${str(after?.code) || effect.entityId} no longer exists`,
          );
        }
        const unchangedSincePurchase =
          cylinder.currentStatus === str(after?.currentStatus) &&
          cylinder.location === str(after?.location) &&
          cylinder.storeId === str(after?.storeId) &&
          cylinder.vehicleId === str(after?.vehicleId);
        if (unchangedSincePurchase) {
          exactCylinderIds.add(cylinder.id);
          if (isGasFillEffect(before, after)) {
            exactGasFills.push(cylinder);
          }
          break;
        }
        if (isGasFillEffect(before, after)) {
          driftedGasFills.push(cylinder);
          break;
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

  const substitutions =
    driftedGasFills.length > 0
      ? await planGasFillSubstitutions(tx, driftedGasFills, exactCylinderIds, exactGasFills)
      : [];
  return { substitutions };
}

/**
 * Reverses previously validated inventory effects inside the caller's transaction,
 * using the plan returned by `assertPurchaseEffectsReversible`.
 */
export async function reversePurchaseInventoryEffects(
  tx: PrismaTx,
  effects: PurchaseInventoryEffect[],
  plan: PurchaseReversalPlan,
): Promise<void> {
  const substitutedOriginalIds = new Set(plan.substitutions.map((s) => s.originalCylinderId));

  if (plan.substitutions.length > 0) {
    const substituteIds = plan.substitutions.map((s) => s.substituteCylinderId);
    const reverted = await tx.cylinder.updateMany({
      where: {
        id: { in: substituteIds },
        currentStatus: 'FULL',
        heldByCustomerId: null,
      },
      data: { currentStatus: 'EMPTY' },
    });
    if (reverted.count !== substituteIds.length) {
      throw new Error('Cannot undo: cylinder stock changed while undoing this purchase. Please try again.');
    }
  }

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
        if (substitutedOriginalIds.has(effect.entityId)) break;
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

/**
 * Fallback inventory reversal for historical purchases that were created before
 * PurchaseInventoryEffect tracking was implemented.
 */
export async function reverseHistoricalPurchaseInventoryFallback(
  tx: PrismaTx,
  purchaseEntries: Array<{
    id: string;
    category: string;
    itemName: string;
    quantity: number;
    regionId?: string | null;
  }>,
  regionId?: string | null,
): Promise<number> {
  let reversedCount = 0;

  for (const entry of purchaseEntries) {
    const qty = Number(entry.quantity || 0);
    if (qty <= 0) continue;

    const itemNameLower = entry.itemName.toLowerCase();
    const isCylinderPurchase = entry.category === 'CYLINDER_PURCHASE';
    const isGasPurchase =
      entry.category === 'GAS_PURCHASE' ||
      (!isCylinderPurchase && (itemNameLower.includes('gas') || /(\d+\.?\d*)\s*kg/i.test(entry.itemName)));

    if (isGasPurchase) {
      const weightMatch = itemNameLower.match(/(\d+\.?\d*)\s*kg/i);
      if (!weightMatch) continue;

      const capacity = parseFloat(weightMatch[1]);
      if (isNaN(capacity) || capacity <= 0) continue;

      const m = entry.itemName.match(/^\s*([^\d(]+?)\s*(?:\(|\b)\s*(\d+(?:\.\d+)?)\s*kg/i);
      const rawTypeName = m?.[1]?.trim() || '';
      const normalizedTypeName = normalizeTypeName(rawTypeName);
      const typeNameForKey =
        normalizedTypeName && !/cylinder|gas/i.test(normalizedTypeName) ? normalizedTypeName : null;

      const generatedType = generateCylinderTypeFromCapacity(capacity);
      const candidates: string[] = [];
      if (Math.abs(capacity - 11.8) < 0.11 || itemNameLower.includes('domestic')) {
        candidates.push('DOMESTIC_11_8KG', generatedType);
      } else if (Math.abs(capacity - 15) < 0.11 || itemNameLower.includes('standard')) {
        candidates.push('STANDARD_15KG', generatedType);
      } else if (Math.abs(capacity - 45.4) < 0.11 || itemNameLower.includes('commercial')) {
        candidates.push('COMMERCIAL_45_4KG', generatedType);
      } else {
        candidates.push(generatedType);
      }

      const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
      const variantKeys = uniqueCandidates.map((ct) =>
        buildCylinderVariantKey({
          cylinderType: ct,
          typeName: typeNameForKey,
          capacity,
        }),
      );

      const targetRegion = entry.regionId || regionId;
      const fullWhere: Prisma.CylinderWhereInput = {
        currentStatus: 'FULL',
        heldByCustomerId: null,
        cylinderRentals: { none: { status: 'ACTIVE' } },
        ...(targetRegion ? regionScopedWhere(targetRegion) : {}),
        OR: uniqueCandidates.map((ct, idx) => ({
          ...buildPrismaCylinderVariantWhere(ct, variantKeys[idx]),
        })),
      };

      const availableFull = await tx.cylinder.count({ where: fullWhere });
      if (availableFull < qty) {
        throw new Error(
          `Cannot undo: this purchase filled ${qty} × ${entry.itemName}, but only ${availableFull} FULL ${entry.itemName} cylinder(s) are in stock. Need ${qty} FULL of this type and capacity to reverse the fill. Undo the related sales first.`,
        );
      }

      const fullCylinders = await tx.cylinder.findMany({
        where: fullWhere,
        take: qty,
        orderBy: { updatedAt: 'desc' },
      });

      await tx.cylinder.updateMany({
        where: { id: { in: fullCylinders.map((c) => c.id) } },
        data: { currentStatus: 'EMPTY' },
      });

      reversedCount += fullCylinders.length;
    } else if (isCylinderPurchase) {
      const weightMatch = itemNameLower.match(/(\d+\.?\d*)\s*kg/i);
      let capacity = 15;
      if (weightMatch) {
        capacity = parseFloat(weightMatch[1]);
      }

      const m = entry.itemName.match(/^\s*([^\d(]+?)\s*(?:\(|\b)\s*(\d+(?:\.\d+)?)\s*kg/i);
      const rawTypeName = m?.[1]?.trim() || '';
      const normalizedTypeName = normalizeTypeName(rawTypeName);
      const typeNameForKey =
        normalizedTypeName && !/cylinder|gas/i.test(normalizedTypeName) ? normalizedTypeName : null;

      const generatedType = generateCylinderTypeFromCapacity(capacity);
      const candidates: string[] = [];
      if (Math.abs(capacity - 11.8) < 0.11 || itemNameLower.includes('domestic')) {
        candidates.push('DOMESTIC_11_8KG', generatedType);
      } else if (Math.abs(capacity - 15) < 0.11 || itemNameLower.includes('standard')) {
        candidates.push('STANDARD_15KG', generatedType);
      } else if (Math.abs(capacity - 45.4) < 0.11 || itemNameLower.includes('commercial')) {
        candidates.push('COMMERCIAL_45_4KG', generatedType);
      } else {
        candidates.push(generatedType);
      }

      const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
      const variantKeys = uniqueCandidates.map((ct) =>
        buildCylinderVariantKey({
          cylinderType: ct,
          typeName: typeNameForKey,
          capacity,
        }),
      );

      const targetRegion = entry.regionId || regionId;

      // Find cylinders created that are still in store and not rented or with customer
      const cylindersToDelete = await tx.cylinder.findMany({
        where: {
          currentStatus: { in: ['EMPTY', 'FULL'] },
          location: { in: ['Store', 'Main Store'] },
          cylinderRentals: { none: { status: 'ACTIVE' } },
          ...(targetRegion ? regionScopedWhere(targetRegion) : {}),
          OR: uniqueCandidates.map((ct, idx) => ({
            ...buildPrismaCylinderVariantWhere(ct, variantKeys[idx]),
          })),
        },
        take: qty,
        orderBy: { createdAt: 'desc' },
      });

      if (cylindersToDelete.length < qty) {
        throw new Error(
          `Cannot undo: Only ${cylindersToDelete.length} of ${qty} ${entry.itemName} cylinder(s) available in store to remove. Some cylinders may have been issued, rented, or reassigned.`,
        );
      }

      await tx.cylinder.deleteMany({
        where: { id: { in: cylindersToDelete.map((c) => c.id) } },
      });

      reversedCount += cylindersToDelete.length;
    } else if (
      entry.category === 'ACCESSORIES_PURCHASE' ||
      entry.category === 'VALVES_PURCHASE' ||
      entry.category === 'VAPORIZER_PURCHASE'
    ) {
      const targetRegion = entry.regionId || regionId;
      const customItem = await tx.customItem.findFirst({
        where: {
          OR: [
            { type: { equals: entry.itemName, mode: 'insensitive' } },
            { name: { equals: entry.itemName, mode: 'insensitive' } },
          ],
          ...(targetRegion ? regionScopedWhere(targetRegion) : {}),
        },
      });

      if (customItem) {
        if (customItem.quantity < qty) {
          throw new Error(
            `Cannot undo: Not enough stock of "${entry.itemName}" remaining in inventory to deduct (Found: ${customItem.quantity}, Needed: ${qty}). Some items may have already been sold.`,
          );
        }

        const remainingQty = customItem.quantity - qty;
        const newTotalCost = remainingQty * Number(customItem.costPerPiece || 0);

        await tx.customItem.update({
          where: { id: customItem.id },
          data: {
            quantity: remainingQty,
            totalCost: newTotalCost,
          },
        });
        reversedCount += qty;
      } else {
        const product = await tx.product.findFirst({
          where: {
            name: { equals: entry.itemName, mode: 'insensitive' },
            ...(targetRegion ? regionScopedWhere(targetRegion) : {}),
          },
        });

        if (product) {
          const currentStock = Number(product.stockQuantity);
          if (currentStock < qty) {
            throw new Error(
              `Cannot undo: Not enough stock of "${entry.itemName}" remaining in inventory to deduct (Found: ${currentStock}, Needed: ${qty}). Some items may have already been sold.`,
            );
          }

          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: { decrement: qty },
            },
          });
          reversedCount += qty;
        }
      }
    }
  }

  return reversedCount;
}
