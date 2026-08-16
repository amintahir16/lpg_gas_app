/**
 * Dynamic Bank & Cash Wallet options for B2B/B2C sales, vendor payments, expenses, and movements.
 * Backwards compatible with legacy hardcoded keys while supporting unlimited custom wallets.
 */

export interface BankWalletOption {
  id?: string;
  name: string;
  code: string;
  type?: 'CASH' | 'BANK' | 'MOBILE_WALLET' | 'OTHER' | string;
  accountNumber?: string | null;
  accountTitle?: string | null;
  bankName?: string | null;
  gradient?: string | null;
  labelTone?: string | null;
  icon?: string | null;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

/**
 * Standard fallback options for immediate rendering before async fetch.
 */
export const DEFAULT_WALLETS: BankWalletOption[] = [
  {
    name: 'Cash',
    code: 'CASH',
    type: 'CASH',
    gradient: 'from-amber-500 to-amber-600',
    labelTone: 'text-amber-100',
    icon: 'CASH',
    description: 'Physical cash float & counter collections',
    isActive: true,
    isDefault: true,
    sortOrder: 1,
  },
  {
    name: 'Bank Transfer',
    code: 'BANK_TRANSFER',
    type: 'BANK',
    gradient: 'from-indigo-500 to-indigo-600',
    labelTone: 'text-indigo-100',
    icon: 'BANK',
    description: 'Direct bank account transfer',
    isActive: true,
    isDefault: false,
    sortOrder: 2,
  },
  {
    name: 'Easypaisa',
    code: 'EASYPAISA',
    type: 'MOBILE_WALLET',
    gradient: 'from-lime-500 to-green-600',
    labelTone: 'text-lime-100',
    icon: 'MOBILE',
    description: 'Easypaisa mobile wallet',
    isActive: true,
    isDefault: false,
    sortOrder: 3,
  },
  {
    name: 'Jazz Cash',
    code: 'JAZZ_CASH',
    type: 'MOBILE_WALLET',
    gradient: 'from-rose-500 to-rose-600',
    labelTone: 'text-rose-100',
    icon: 'MOBILE',
    description: 'Jazz Cash mobile wallet',
    isActive: true,
    isDefault: false,
    sortOrder: 4,
  },
];

export const PAYMENT_METHOD_OPTIONS = DEFAULT_WALLETS.map((w) => ({
  value: w.code,
  label: w.name,
}));

export type PaymentMethodValue = string;

export const WALLET_COLOR_PRESETS = [
  { id: 'amber', name: 'Amber Gold', gradient: 'from-amber-500 to-amber-600', labelTone: 'text-amber-100' },
  { id: 'indigo', name: 'Royal Indigo', gradient: 'from-indigo-500 to-indigo-600', labelTone: 'text-indigo-100' },
  { id: 'emerald', name: 'Emerald Green', gradient: 'from-emerald-500 to-emerald-600', labelTone: 'text-emerald-100' },
  { id: 'rose', name: 'Rose Red', gradient: 'from-rose-500 to-rose-600', labelTone: 'text-rose-100' },
  { id: 'lime', name: 'Lime Green', gradient: 'from-lime-500 to-green-600', labelTone: 'text-lime-100' },
  { id: 'violet', name: 'Deep Violet', gradient: 'from-violet-500 to-purple-600', labelTone: 'text-violet-100' },
  { id: 'cyan', name: 'Vibrant Cyan', gradient: 'from-cyan-500 to-blue-600', labelTone: 'text-cyan-100' },
  { id: 'sky', name: 'Sky Blue', gradient: 'from-sky-500 to-indigo-500', labelTone: 'text-sky-100' },
  { id: 'teal', name: 'Ocean Teal', gradient: 'from-teal-500 to-emerald-600', labelTone: 'text-teal-100' },
  { id: 'slate', name: 'Modern Slate', gradient: 'from-slate-600 to-slate-700', labelTone: 'text-slate-200' },
  { id: 'orange', name: 'Sunset Orange', gradient: 'from-orange-500 to-amber-600', labelTone: 'text-orange-100' },
  { id: 'fuchsia', name: 'Fuchsia Pink', gradient: 'from-fuchsia-500 to-pink-600', labelTone: 'text-fuchsia-100' },
] as const;

export const DEFAULT_WALLET_STYLE = {
  gradient: 'from-slate-600 to-slate-700',
  labelTone: 'text-slate-200',
};

const LEGACY_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  EASYPAISA: 'Easypaisa',
  JAZZ_CASH: 'Jazz Cash',
  CHECK: 'Check',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  WIRE_TRANSFER: 'Wire Transfer',
};

export const PAYMENT_METHOD_CARD_STYLES: Record<
  string,
  { gradient: string; labelTone: string }
> = {
  CASH: { gradient: 'from-amber-500 to-amber-600', labelTone: 'text-amber-100' },
  BANK_TRANSFER: { gradient: 'from-indigo-500 to-indigo-600', labelTone: 'text-indigo-100' },
  EASYPAISA: { gradient: 'from-lime-500 to-green-600', labelTone: 'text-lime-100' },
  JAZZ_CASH: { gradient: 'from-rose-500 to-rose-600', labelTone: 'text-rose-100' },
};

export type WalletStyleLike = {
  gradient?: string | null;
  labelTone?: string | null;
  [key: string]: any;
};

/** Get card gradient and labelTone for any wallet code */
export function getWalletStyle(
  code: string | null | undefined,
  wallet?: WalletStyleLike | null
): { gradient: string; labelTone: string } {
  if (wallet?.gradient && wallet?.labelTone) {
    return { gradient: wallet.gradient, labelTone: wallet.labelTone };
  }
  const key = normalizePaymentMethodKey(code);
  if (key && PAYMENT_METHOD_CARD_STYLES[key]) {
    return PAYMENT_METHOD_CARD_STYLES[key];
  }
  if (!key) return DEFAULT_WALLET_STYLE;
  // Deterministic color assignment based on code hash for custom wallets without explicit style
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % WALLET_COLOR_PRESETS.length;
  return WALLET_COLOR_PRESETS[index];
}

export function formatPaymentMethodLabel(
  method: string | null | undefined,
  wallets?: BankWalletOption[] | null
): string {
  if (!method) return '-';
  const key = normalizePaymentMethodKey(method);
  if (wallets?.length) {
    const found = wallets.find((w) => w.code === key || w.name.toUpperCase() === key);
    if (found) return found.name;
  }
  if (key && LEGACY_LABELS[key]) return LEGACY_LABELS[key];
  return method.replace(/_/g, ' ');
}

export function isSelectablePaymentMethod(method: string | null | undefined): boolean {
  if (!method) return false;
  return method.trim().length > 0;
}

export function emptyPaymentMethodTotals(
  customKeys?: string[]
): Record<string, number> {
  const totals: Record<string, number> = {
    CASH: 0,
    BANK_TRANSFER: 0,
    EASYPAISA: 0,
    JAZZ_CASH: 0,
  };
  if (customKeys?.length) {
    for (const k of customKeys) {
      totals[k] = 0;
    }
  }
  return totals;
}

export function normalizePaymentMethodKey(
  method: string | null | undefined
): string | null {
  if (!method) return null;
  const key = method.trim().toUpperCase().replace(/\s+/g, '_');
  return key.length > 0 ? key : null;
}

export function adjustPaymentMethodAmount(
  totals: Record<string, number>,
  method: string | null | undefined,
  amount: number
) {
  if (!amount) return;
  const key = normalizePaymentMethodKey(method);
  if (!key) return;
  totals[key] = (totals[key] || 0) + amount;
}

export type PaymentMethodAmountEntry = {
  method: string | null | undefined;
  amount: number;
};

export function buildPaymentMethodTotals(params: {
  collections: PaymentMethodAmountEntry[];
  deductions?: PaymentMethodAmountEntry[];
  wallets?: BankWalletOption[];
}): Record<string, number> {
  const customKeys = params.wallets ? params.wallets.map((w) => w.code) : undefined;
  const totals = emptyPaymentMethodTotals(customKeys);
  for (const entry of params.collections) {
    adjustPaymentMethodAmount(totals, entry.method, entry.amount);
  }
  for (const entry of params.deductions || []) {
    adjustPaymentMethodAmount(totals, entry.method, -Math.abs(entry.amount));
  }
  return totals;
}
