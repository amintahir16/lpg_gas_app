import {
  formatPaymentMethodLabel,
  isSelectablePaymentMethod,
  type PaymentMethodValue,
} from '@/lib/payment-methods';

export type BankLedgerDirection = 'IN' | 'OUT';

export type BankLedgerSource =
  | 'B2B_SALE'
  | 'B2B_PAYMENT'
  | 'B2C_SALE'
  | 'VENDOR_PAYMENT'
  | 'OFFICE_EXPENSE'
  | 'BANK_DEPOSIT'
  | 'BANK_TRANSFER_IN'
  | 'BANK_TRANSFER_OUT';

export interface BankLedgerEntry {
  id: string;
  source: BankLedgerSource;
  sourceLabel: string;
  direction: BankLedgerDirection;
  amount: number;
  /** Primary event timestamp (ISO) */
  occurredAt: string;
  dayName: string;
  dateLabel: string;
  timeLabel: string;
  /** Customer / vendor / office / bank */
  partyName: string;
  partyType: 'B2B Customer' | 'B2C Customer' | 'Vendor' | 'Office' | 'Bank';
  /** Staff who recorded the entry */
  recordedBy: string | null;
  /** What was sold / paid / expense purpose */
  details: string;
  reference: string | null;
  notes: string | null;
  typeDetail: string;
}

export const BANK_LEDGER_SOURCE_LABELS: Record<BankLedgerSource, string> = {
  B2B_SALE: 'B2B Sale Payment',
  B2B_PAYMENT: 'B2B Payment',
  B2C_SALE: 'B2C Sale',
  VENDOR_PAYMENT: 'Vendor Payment',
  OFFICE_EXPENSE: 'Office Expense',
  BANK_DEPOSIT: 'Bank Deposit',
  BANK_TRANSFER_IN: 'Bank Transfer In',
  BANK_TRANSFER_OUT: 'Bank Transfer Out',
};

export function parseBankMethodParam(
  value: string | null | undefined
): PaymentMethodValue | null {
  if (!value) return null;
  const key = value.trim().toUpperCase().replace(/\s+/g, '_');
  return isSelectablePaymentMethod(key) ? key : null;
}

export function bankMethodTitle(method: PaymentMethodValue): string {
  return formatPaymentMethodLabel(method);
}

type UserLike = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined;

export function userDisplayName(user: UserLike): string | null {
  if (!user) return null;
  const full =
    user.name?.trim() ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.email?.trim() ||
    '';
  return full || null;
}

export function formatLedgerDateParts(input: Date | string) {
  const d = typeof input === 'string' ? new Date(input) : input;
  return {
    occurredAt: d.toISOString(),
    dayName: d.toLocaleDateString('en-PK', { weekday: 'long' }),
    dateLabel: d.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: d.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

/** Prefer transaction `time` when present; otherwise fall back to `date` / createdAt. */
export function coalesceEventDate(
  primary: Date | string | null | undefined,
  fallback?: Date | string | null | undefined
): Date {
  if (primary) return new Date(primary);
  if (fallback) return new Date(fallback);
  return new Date();
}

export function summarizeLineItems(
  items: Array<{ name: string; quantity: number | string; totalPrice?: number | string }>
): string {
  if (!items.length) return '—';
  return items
    .map((item) => {
      const qty = Number(item.quantity);
      const qtyLabel = Number.isFinite(qty) ? qty : item.quantity;
      return `${item.name} × ${qtyLabel}`;
    })
    .join(', ');
}
