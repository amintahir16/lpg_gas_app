/**
 * Stable identity for cylinders: Prisma cylinderType string + normalized typeName + capacity.
 * Delimiter aligns with cylinder-dues / inventory stats grouping.
 */

export interface ParsedCylinderVariantKey {
  cylinderType: string;
  capacity: number | null;
  normalizedTypeNameLower: string | null;
}

export function buildCylinderVariantKey(input: {
  cylinderType: string;
  typeName?: string | null;
  capacity?: number | string | null;
}): string {
  const cap =
    input.capacity === undefined || input.capacity === null || input.capacity === ''
      ? 'null'
      : String(
          typeof input.capacity === 'string' ? parseFloat(input.capacity) : input.capacity,
        );
  const tnRaw = input.typeName?.trim() ?? '';
  const tnNorm = tnRaw === '' ? 'null' : tnRaw.toLowerCase();
  return `${input.cylinderType}|||${cap}|||${tnNorm}`;
}

/** Returns null if key is not a compound variant key (legacy enum-only payloads). */
export function parseCylinderVariantKey(key: string): ParsedCylinderVariantKey | null {
  if (!key || typeof key !== 'string' || !key.includes('|||')) {
    return null;
  }
  const parts = key.split('|||');
  if (parts.length !== 3) return null;
  const cylinderType = parts[0];
  const capacityStr = parts[1];
  const tnLower = parts[2];
  const capacity =
    capacityStr === 'null' || capacityStr === ''
      ? null
      : (() => {
          const n = parseFloat(capacityStr);
          return Number.isFinite(n) ? n : null;
        })();
  const normalizedTypeNameLower =
    tnLower === 'null' || tnLower === '' ? null : tnLower.toLowerCase();
  return { cylinderType, capacity, normalizedTypeNameLower };
}

/**
 * Adds typeName/capacity filters when variantKey parses; otherwise { cylinderType } only.
 */
export function buildPrismaCylinderVariantWhere(
  baseCylinderType: string,
  variantKey?: string | null,
): Record<string, unknown> {
  const parsed = variantKey ? parseCylinderVariantKey(variantKey) : null;
  const cylType = parsed?.cylinderType ?? baseCylinderType;
  const w: Record<string, unknown> = { cylinderType: cylType };

  if (
    parsed?.capacity !== null &&
    parsed?.capacity !== undefined &&
    Number.isFinite(parsed.capacity)
  ) {
    w.capacity = parsed.capacity;
  }
  if (parsed?.normalizedTypeNameLower && parsed.normalizedTypeNameLower !== 'null') {
    w.typeName = {
      equals: parsed.normalizedTypeNameLower,
      mode: 'insensitive' as const,
    };
  }
  return w;
}
