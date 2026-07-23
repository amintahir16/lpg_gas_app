/**
 * Opening balances for newly-migrated B2B customers.
 *
 * These are recorded through the standard B2B transaction pipeline (so net
 * balance and physical cylinder inventory update exactly like any other
 * transaction), but they represent a customer's *starting state* rather than a
 * real sale/return. They are tagged via the transaction `notes` /
 * `paymentReference` fields and detected here so that derived/display logic
 * (reports, profit totals, sold qty) can treat them correctly WITHOUT altering
 * the underlying transaction data flow.
 *
 * - Opening Balance: a SALE (owes) or CREDIT_NOTE (credit) with no items.
 * - Opening Cylinder Dues: a SALE with totalAmount 0 whose cylinder items are
 *   *deliveries* (cylinders the customer already holds), recorded at price 0.
 *   These must NOT contribute sold qty, revenue, or gas margin / Total profit —
 *   they are a starting inventory state, not an earned sale.
 */

export const OPENING_BALANCE_NOTE = 'Opening Balance';
export const OPENING_DUES_NOTE = 'Opening Cylinder Dues';
/** Stable machine marker stored on `paymentReference` for opening dues. */
export const OPENING_DUES_REF = 'OPENING_CYLINDER_DUES';

export function isOpeningBalanceTransaction(t: { notes?: string | null } | null | undefined): boolean {
  return !!t && (t.notes || '').trim() === OPENING_BALANCE_NOTE;
}

export function isOpeningDuesTransaction(
  t:
    | {
        notes?: string | null;
        paymentReference?: string | null;
        totalAmount?: number | string | { toString(): string } | null;
      }
    | null
    | undefined
): boolean {
  if (!t) return false;
  const notes = (t.notes || '').trim();
  if (notes === OPENING_DUES_NOTE) return true;
  if ((t.paymentReference || '').trim() === OPENING_DUES_REF) return true;
  if (notes.toLowerCase().includes('opening cylinder dues')) return true;
  return false;
}

/**
 * True when a B2B SALE line should be excluded from sold qty / revenue / profit.
 * Covers tagged opening dues and the zero-priced fallback (price 0 + bill 0)
 * used when opening dues were saved without a matching notes string.
 */
export function isOpeningDuesSaleItem(
  transaction:
    | {
        notes?: string | null;
        paymentReference?: string | null;
        totalAmount?: number | string | { toString(): string } | null;
        transactionType?: string | null;
      }
    | null
    | undefined,
  item:
    | {
        cylinderType?: string | null;
        pricePerItem?: number | string | { toString(): string } | null;
        totalPrice?: number | string | { toString(): string } | null;
      }
    | null
    | undefined
): boolean {
  if (!transaction || !item) return false;
  if (isOpeningDuesTransaction(transaction)) return true;

  const txType = transaction.transactionType;
  if (txType && txType !== 'SALE') return false;
  if (!item.cylinderType) return false;

  const totalAmount = Number(transaction.totalAmount ?? NaN);
  const pricePerItem = Number(item.pricePerItem ?? NaN);
  const totalPrice = Number(item.totalPrice ?? NaN);

  // Opening dues are always recorded as a zero-value cylinder delivery.
  return totalAmount === 0 && pricePerItem === 0 && totalPrice === 0;
}

export function isOpeningEntryTransaction(t: { notes?: string | null } | null | undefined): boolean {
  return isOpeningBalanceTransaction(t) || isOpeningDuesTransaction(t);
}
