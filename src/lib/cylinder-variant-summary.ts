import { parseCylinderVariantKey } from '@/lib/cylinder-variant-key';
import { getCapacityFromTypeString, getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

export type VariantItemLike = {
  cylinderType?: string | null;
  cylinderVariantKey?: string | null;
  quantity?: number | string | null;
};

function formatVariantLabelFromKeyOrType(item: VariantItemLike): string | null {
  const vk = item.cylinderVariantKey?.trim();
  if (vk && vk.includes('|||')) {
    const parsed = parseCylinderVariantKey(vk);
    if (!parsed?.cylinderType) return null;
    const cap = parsed.capacity ?? getCapacityFromTypeString(parsed.cylinderType);
    if (parsed.normalizedTypeNameLower && parsed.normalizedTypeNameLower !== 'null') {
      const tn = parsed.normalizedTypeNameLower.replace(/\b\w/g, (c) => c.toUpperCase());
      return `${tn} (${cap}kg)`;
    }
    return `${getCylinderTypeDisplayName(parsed.cylinderType)} (${cap}kg)`;
  }
  const ct = item.cylinderType?.trim();
  if (!ct) return null;
  const cap = getCapacityFromTypeString(ct);
  return `${getCylinderTypeDisplayName(ct)} (${cap}kg)`;
}

/**
 * Build a short "qty Label, qty Label" string, grouped by cylinder variant.
 * Intended for activity logs + notifications.
 */
export function buildCylinderVariantSummary(items: VariantItemLike[]): string {
  const grouped = new Map<string, number>();
  for (const it of items || []) {
    if (!it?.cylinderType && !it?.cylinderVariantKey) continue;
    const label = formatVariantLabelFromKeyOrType(it);
    if (!label) continue;
    const qty = Number(it.quantity || 0) || 0;
    if (qty <= 0) continue;
    grouped.set(label, (grouped.get(label) || 0) + qty);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, qty]) => `${qty} ${label}`)
    .join(', ');
}

