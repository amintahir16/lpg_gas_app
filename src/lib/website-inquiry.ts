import type { WebsiteInquiryType } from '@prisma/client';

export type ShopCartItemInput = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string | null;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function sanitizeWebsiteField(value: unknown, max: number): string {
  if (value === null || value === undefined) return '';
  const cleaned = stripHtml(String(value));
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

export function isValidEmail(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeCartItems(raw: unknown): ShopCartItemInput[] {
  if (!Array.isArray(raw)) return [];
  const items: ShopCartItemInput[] = [];
  for (const entry of raw.slice(0, 20)) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const id = sanitizeWebsiteField(row.id, 40);
    const name = sanitizeWebsiteField(row.name, 120);
    const price = Number(row.price);
    const quantity = Math.floor(Number(row.quantity));
    if (!id || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }
    items.push({
      id,
      name,
      price: Math.round(price * 100) / 100,
      quantity: Math.min(quantity, 99),
      size: sanitizeWebsiteField(row.size, 40) || null,
    });
  }
  return items;
}

export function computeCartTotal(items: ShopCartItemInput[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function buildInquiryNotificationCopy(
  type: WebsiteInquiryType,
  input: { name: string; subject?: string | null; totalAmount?: number | null }
) {
  if (type === 'SHOP_ORDER') {
    const total = input.totalAmount != null ? ` — PKR ${Math.round(input.totalAmount).toLocaleString()}` : '';
    return {
      title: 'New shop order request',
      message: `${input.name} submitted a trolley checkout${total}.`,
    };
  }
  return {
    title: 'New contact inquiry',
    message: `${input.name} sent a message${input.subject ? `: ${input.subject}` : ''}.`,
  };
}
