import {
  buildCylinderVariantKey,
  parseCylinderVariantKey,
} from '@/lib/cylinder-variant-key';
import {
  getCapacityFromTypeString,
  getCylinderTypeDisplayName,
} from '@/lib/cylinder-utils';

type EnumCylinderMap = Map<
  string,
  { typeName: string | null; capacity: number | null }
>;

/** Key for B2B reports / stats: stored variant key when present, else synthetic from enum (legacy). */
export function b2bItemVariantKey(item: {
  cylinderVariantKey?: string | null;
  cylinderType?: string | null;
}): string | null {
  const vk = item.cylinderVariantKey?.trim();
  if (vk && vk.includes('|||')) return vk;
  if (!item.cylinderType?.trim()) return null;
  return buildCylinderVariantKey({
    cylinderType: item.cylinderType.trim(),
    typeName: null,
    capacity: getCapacityFromTypeString(item.cylinderType.trim()),
  });
}

/**
 * Human label for a saved line item (ledger, PDF, APIs).
 * Uses `cylinderVariantKey` when set; otherwise falls back to enum + optional DB map.
 */
export function formatB2bItemCylinderLabel(
  item: {
    cylinderVariantKey?: string | null;
    cylinderType?: string | null;
  },
  enumCylinderMap?: EnumCylinderMap,
): string {
  const ct = item.cylinderType?.trim();
  const vk = item.cylinderVariantKey?.trim();
  if (vk && vk.includes('|||')) {
    const p = parseCylinderVariantKey(vk);
    if (
      p?.normalizedTypeNameLower &&
      p.normalizedTypeNameLower !== 'null'
    ) {
      const name = p.normalizedTypeNameLower.replace(/\b\w/g, (c) =>
        c.toUpperCase(),
      );
      const cap =
        p.capacity != null && Number.isFinite(p.capacity)
          ? String(p.capacity)
          : '?';
      return `${name} (${cap}kg)`;
    }
    if (p?.cylinderType) {
      return formatEnumCylinderLabel(p.cylinderType, enumCylinderMap);
    }
  }
  if (ct) return formatEnumCylinderLabel(ct, enumCylinderMap);
  return 'Item';
}

export function formatB2bVariantKeyForReport(
  variantKey: string,
  enumCylinderMap?: EnumCylinderMap,
): string {
  const parsed = parseCylinderVariantKey(variantKey);
  return formatB2bItemCylinderLabel(
    {
      cylinderVariantKey: variantKey,
      cylinderType: parsed?.cylinderType ?? null,
    },
    enumCylinderMap,
  );
}

function formatEnumCylinderLabel(
  cylinderType: string,
  enumCylinderMap?: EnumCylinderMap,
): string {
  if (enumCylinderMap?.has(cylinderType)) {
    const cylinderInfo = enumCylinderMap.get(cylinderType)!;
    if (
      cylinderInfo.typeName?.trim() &&
      cylinderInfo.typeName.trim().toLowerCase() !== 'cylinder'
    ) {
      const capacity =
        cylinderInfo.capacity !== null ? cylinderInfo.capacity : 'N/A';
      return `${cylinderInfo.typeName.trim()} (${capacity}kg)`;
    }
    if (cylinderInfo.capacity !== null) {
      return `Cylinder (${cylinderInfo.capacity}kg)`;
    }
  }
  return getCylinderTypeDisplayName(cylinderType);
}
