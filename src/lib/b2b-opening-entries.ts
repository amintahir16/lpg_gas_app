/**
 * Opening balances for newly-migrated B2B customers.
 *
 * These are recorded through the standard B2B transaction pipeline (so net
 * balance and physical cylinder inventory update exactly like any other
 * transaction), but they represent a customer's *starting state* rather than a
 * real sale/return. They are tagged via the transaction `notes` field and
 * detected here so that derived/display logic (reports, profit totals) can
 * treat them correctly WITHOUT altering the underlying transaction data flow.
 *
 * - Opening Balance: a SALE (owes) or CREDIT_NOTE (credit) with no items.
 * - Opening Cylinder Dues: a SALE with totalAmount 0 whose cylinder items are
 *   *deliveries* (cylinders the customer already holds), recorded at price 0.
 */

export const OPENING_BALANCE_NOTE = 'Opening Balance';
export const OPENING_DUES_NOTE = 'Opening Cylinder Dues';

export function isOpeningBalanceTransaction(t: { notes?: string | null } | null | undefined): boolean {
  return !!t && t.notes === OPENING_BALANCE_NOTE;
}

export function isOpeningDuesTransaction(t: { notes?: string | null } | null | undefined): boolean {
  return !!t && t.notes === OPENING_DUES_NOTE;
}

export function isOpeningEntryTransaction(t: { notes?: string | null } | null | undefined): boolean {
  return isOpeningBalanceTransaction(t) || isOpeningDuesTransaction(t);
}
