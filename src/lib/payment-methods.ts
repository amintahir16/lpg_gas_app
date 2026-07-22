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
