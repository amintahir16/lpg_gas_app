/**
 * Time-boxed undo rights for B2B / B2C customer transactions.
 *
 * ADMIN may undo only within a limited window after the transaction was
 * recorded. SUPER_ADMIN is exempt and may undo at any time.
 * Measured from `createdAt` (when the row was saved), never from the
 * user-chosen `date` / `time` fields which can be backdated.
 *
 * Single source of truth: API routes enforce, UI hides/locks the button.
 */

export const TRANSACTION_UNDO_WINDOW_HOURS = 24;
export const TRANSACTION_UNDO_WINDOW_MS =
  TRANSACTION_UNDO_WINDOW_HOURS * 60 * 60 * 1000;

export const TRANSACTION_UNDO_WINDOW_MESSAGE =
  `This transaction can no longer be undone. Admins may only undo within ${TRANSACTION_UNDO_WINDOW_HOURS} hours after the transaction is recorded.`;

export type CanUndoTransactionOptions = {
  now?: number;
  /** When SUPER_ADMIN, the 24h window does not apply. */
  role?: string | null;
};

function toTimestamp(createdAt: Date | string | number): number {
  const time = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return Number.isFinite(time) ? time : NaN;
}

/** Milliseconds left in the undo window. `0` once closed or if timestamp is bad. */
export function transactionUndoWindowRemainingMs(
  createdAt: Date | string | number,
  now: number = Date.now()
): number {
  const created = toTimestamp(createdAt);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, created + TRANSACTION_UNDO_WINDOW_MS - now);
}

/**
 * Whether undo is still allowed.
 * - SUPER_ADMIN: always (no time window)
 * - ADMIN / others: only within TRANSACTION_UNDO_WINDOW_HOURS of createdAt
 *
 * Second argument may be a timestamp (legacy) or `{ now, role }`.
 */
export function canUndoTransaction(
  createdAt: Date | string | number,
  nowOrOptions: number | CanUndoTransactionOptions = Date.now()
): boolean {
  const options: CanUndoTransactionOptions =
    typeof nowOrOptions === 'number' ? { now: nowOrOptions } : nowOrOptions ?? {};

  if (options.role === 'SUPER_ADMIN') return true;

  return transactionUndoWindowRemainingMs(createdAt, options.now ?? Date.now()) > 0;
}

/** Short human hint, e.g. "5h 12m left to undo". */
export function formatTransactionUndoWindowRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '';
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return `${parts} left to undo`;
}
