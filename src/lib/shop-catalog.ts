import type { ShopCatalogIcon } from '@prisma/client';

export const SHOP_ICON_OPTIONS: { value: ShopCatalogIcon; label: string }[] = [
  { value: 'HOME', label: 'Home' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'FACTORY', label: 'Factory' },
  { value: 'FLAME', label: 'Flame' },
  { value: 'PACKAGE', label: 'Package' },
  { value: 'TRUCK', label: 'Truck' },
];

export const SHOP_ACCENT_COLORS = [
  { value: '#f8a11b', label: 'Amber' },
  { value: '#f36523', label: 'Orange' },
  { value: '#e1382b', label: 'Red' },
];

export type ShopCatalogItemInput = {
  name: string;
  description: string;
  price: number;
  sizeLabel?: string | null;
  deliveryTimeNote?: string | null;
  icon: ShopCatalogIcon;
  accentColor: string;
  inStock: boolean;
  isActive: boolean;
  sortOrder: number;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function sanitizeShopField(value: unknown, max: number): string {
  if (value === null || value === undefined) return '';
  const cleaned = stripHtml(String(value));
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

const VALID_ICONS = new Set<ShopCatalogIcon>(['HOME', 'BUILDING', 'FACTORY', 'FLAME', 'PACKAGE', 'TRUCK']);
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function parseShopCatalogPayload(body: Record<string, unknown>): ShopCatalogItemInput | { error: string } {
  const name = sanitizeShopField(body.name, 120);
  const description = sanitizeShopField(body.description, 2000);
  const sizeLabel = sanitizeShopField(body.sizeLabel, 80);
  const deliveryTimeNote = sanitizeShopField(body.deliveryTimeNote, 120);
  const priceRaw = Number(body.price);
  const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? Math.round(priceRaw * 100) / 100 : NaN;
  const icon = typeof body.icon === 'string' && VALID_ICONS.has(body.icon as ShopCatalogIcon)
    ? (body.icon as ShopCatalogIcon)
    : 'PACKAGE';
  const accentColorRaw = sanitizeShopField(body.accentColor, 7);
  const accentColor = HEX_COLOR.test(accentColorRaw) ? accentColorRaw : '#f36523';
  const inStock = body.inStock !== false;
  const isActive = body.isActive !== false;
  const sortOrderRaw = parseInt(String(body.sortOrder ?? '0'), 10);
  const sortOrder = Number.isFinite(sortOrderRaw) ? Math.max(0, Math.min(sortOrderRaw, 9999)) : 0;

  if (!name) return { error: 'Item name is required.' };
  if (!description) return { error: 'Description is required.' };
  if (!Number.isFinite(price)) return { error: 'Price must be zero or a positive number.' };

  return {
    name,
    description,
    price,
    sizeLabel: sizeLabel || null,
    deliveryTimeNote: deliveryTimeNote || null,
    icon,
    accentColor,
    inStock,
    isActive,
    sortOrder,
  };
}

export function serializeShopCatalogItem(item: {
  id: string;
  name: string;
  description: string;
  price: { toString(): string } | number | string;
  sizeLabel: string | null;
  deliveryTimeNote: string | null;
  icon: ShopCatalogIcon;
  accentColor: string;
  inStock: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    sizeLabel: item.sizeLabel,
    deliveryTimeNote: item.deliveryTimeNote,
    icon: item.icon,
    accentColor: item.accentColor,
    inStock: item.inStock,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/** Seed the public shop with the original hard-coded catalogue once. */
export const DEFAULT_SHOP_CATALOG: Omit<ShopCatalogItemInput, 'isActive'>[] = [
  {
    name: 'Domestic Cylinder',
    description: 'Perfect for everyday home cooking and small household needs.',
    price: 2500,
    sizeLabel: '11.8 KG',
    deliveryTimeNote: 'Same-day delivery',
    icon: 'HOME',
    accentColor: '#f8a11b',
    inStock: true,
    sortOrder: 1,
  },
  {
    name: 'Standard Cylinder',
    description: 'Ideal for larger families and small business operations.',
    price: 3200,
    sizeLabel: '15 KG',
    deliveryTimeNote: 'Same-day delivery',
    icon: 'BUILDING',
    accentColor: '#f36523',
    inStock: true,
    sortOrder: 2,
  },
  {
    name: 'Commercial Cylinder',
    description: 'Heavy-duty supply for restaurants, factories, and industrial use.',
    price: 8500,
    sizeLabel: '44.5 KG',
    deliveryTimeNote: 'Next-day delivery',
    icon: 'FACTORY',
    accentColor: '#e1382b',
    inStock: true,
    sortOrder: 3,
  },
  {
    name: 'Refill Service',
    description: 'Professional, certified refill for your existing LPG cylinders.',
    price: 1200,
    sizeLabel: 'Any Size',
    deliveryTimeNote: 'Within 24 hours',
    icon: 'FLAME',
    accentColor: '#f8a11b',
    inStock: true,
    sortOrder: 4,
  },
  {
    name: 'Bulk Order Package',
    description: 'Custom bulk pricing for businesses. Contact us for a tailored quote.',
    price: 0,
    sizeLabel: null,
    deliveryTimeNote: 'Quote within 24 hours',
    icon: 'PACKAGE',
    accentColor: '#f36523',
    inStock: true,
    sortOrder: 5,
  },
  {
    name: 'Safety Equipment Kit',
    description: 'Complete safety kit: gloves, regulator wrench, leak detector & guide.',
    price: 3500,
    sizeLabel: null,
    deliveryTimeNote: '2–3 business days',
    icon: 'PACKAGE',
    accentColor: '#e1382b',
    inStock: true,
    sortOrder: 6,
  },
];

export async function seedShopCatalogIfEmpty(
  createMany: (args: { data: Array<ShopCatalogItemInput> }) => Promise<{ count: number }>,
  count: () => Promise<number>
) {
  const existing = await count();
  if (existing > 0) return false;
  await createMany({
    data: DEFAULT_SHOP_CATALOG.map((item) => ({ ...item, isActive: true })),
  });
  return true;
}
