/**
 * Time-boxed undo rights for B2B / B2C customer transactions.
 *
 * Both ADMIN and SUPER_ADMIN may undo a transaction only within a limited
 * window after it was recorded. Once the window closes the transaction is
 * immutable for everyone. Measured from `createdAt` (when the row was saved),
 * never from the user-chosen `date` / `time` fields which can be backdated.
 *
 * Single source of truth: API routes enforce, UI hides/locks the button.
 */

export const TRANSACTION_UNDO_WINDOW_HOURS = 24;
export const TRANSACTION_UNDO_WINDOW_MS =
  TRANSACTION_UNDO_WINDOW_HOURS * 60 * 60 * 1000;

export const TRANSACTION_UNDO_WINDOW_MESSAGE =
  `This transaction can no longer be undone. Undo is only allowed within ${TRANSACTION_UNDO_WINDOW_HOURS} hours after the transaction is recorded.`;

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
 * Whether undo is still allowed. Applies to ADMIN and SUPER_ADMIN alike —
 * there is no role exemption.
 */
export function canUndoTransaction(
  createdAt: Date | string | number,
  now: number = Date.now()
): boolean {
  return transactionUndoWindowRemainingMs(createdAt, now) > 0;
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
