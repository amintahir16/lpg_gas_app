/**
 * Canonical payment method options for B2B transactions and vendor payments.
 * Legacy Prisma enum values (CHECK, CREDIT_CARD, etc.) remain in the DB for
 * existing rows but are no longer offered in new-entry dropdowns.
 */
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'EASYPAISA', label: 'Easypaisa' },
  { value: 'JAZZ_CASH', label: 'Jazz Cash' },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHOD_OPTIONS)[number]['value'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  EASYPAISA: 'Easypaisa',
  JAZZ_CASH: 'Jazz Cash',
  // Legacy values — still display correctly for historical records
  CHECK: 'Check',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  WIRE_TRANSFER: 'Wire Transfer',
};

export function formatPaymentMethodLabel(
  method: string | null | undefined
): string {
  if (!method) return '-';
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ');
}

export function isSelectablePaymentMethod(
  method: string
): method is PaymentMethodValue {
  return PAYMENT_METHOD_OPTIONS.some((option) => option.value === method);
}

/** Zeroed totals for the selectable payment methods (Cash, Bank Transfer, Easypaisa, Jazz Cash). */
export function emptyPaymentMethodTotals(): Record<PaymentMethodValue, number> {
  return {
    CASH: 0,
    BANK_TRANSFER: 0,
    EASYPAISA: 0,
    JAZZ_CASH: 0,
  };
}

export function normalizePaymentMethodKey(
  method: string | null | undefined
): PaymentMethodValue | null {
  if (!method) return null;
  const key = method.trim().toUpperCase().replace(/\s+/g, '_');
  return isSelectablePaymentMethod(key) ? key : null;
}

/** Add (or subtract via negative amount) into selectable payment-method buckets. */
export function adjustPaymentMethodAmount(
  totals: Record<PaymentMethodValue, number>,
  method: string | null | undefined,
  amount: number
) {
  if (!amount) return;
  const key = normalizePaymentMethodKey(method);
  if (!key) return;
  totals[key] += amount;
}

export type PaymentMethodAmountEntry = {
  method: string | null | undefined;
  amount: number;
};

/**
 * Build payment-method totals from collections (inflows) and optional deductions (outflows).
 * Used by Revenue (gross) and Financial summary (net = collections − deductions).
 */
export function buildPaymentMethodTotals(params: {
  collections: PaymentMethodAmountEntry[];
  deductions?: PaymentMethodAmountEntry[];
}): Record<PaymentMethodValue, number> {
  const totals = emptyPaymentMethodTotals();
  for (const entry of params.collections) {
    adjustPaymentMethodAmount(totals, entry.method, entry.amount);
  }
  for (const entry of params.deductions || []) {
    adjustPaymentMethodAmount(totals, entry.method, -Math.abs(entry.amount));
  }
  return totals;
}

/** Shared card gradient styles for Cash / Bank Transfer / Easypaisa / Jazz Cash. */
export const PAYMENT_METHOD_CARD_STYLES: Record<
  PaymentMethodValue,
  { gradient: string; labelTone: string }
> = {
  CASH: {
    gradient: 'from-amber-500 to-amber-600',
    labelTone: 'text-amber-100',
  },
  BANK_TRANSFER: {
    gradient: 'from-indigo-500 to-indigo-600',
    labelTone: 'text-indigo-100',
  },
  EASYPAISA: {
    gradient: 'from-lime-500 to-green-600',
    labelTone: 'text-lime-100',
  },
  JAZZ_CASH: {
    gradient: 'from-rose-500 to-rose-600',
    labelTone: 'text-rose-100',
  },
};
