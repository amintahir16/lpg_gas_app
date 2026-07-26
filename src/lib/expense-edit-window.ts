/**
 * Time-boxed edit rights for expense records.
 *
 * An ADMIN may correct a mistake for a limited window after the entry was
 * recorded; once that window closes the record is immutable to them and only
 * a SUPER_ADMIN can amend it. The window is measured from `createdAt` (when
 * the entry was made) — never from `expenseDate`, which the user chooses and
 * could backdate.
 *
 * This module is the single source of truth for the rule: the API routes use
 * it to enforce, the UI uses it to disable the buttons and explain why.
 */

export const EXPENSE_EDIT_WINDOW_HOURS = 24;
export const EXPENSE_EDIT_WINDOW_MS = EXPENSE_EDIT_WINDOW_HOURS * 60 * 60 * 1000;

export const EXPENSE_EDIT_WINDOW_MESSAGE =
  `This entry can no longer be edited or deleted. Expenses are locked ${EXPENSE_EDIT_WINDOW_HOURS} hours after they are recorded — please ask a Super Admin to make changes.`;

function toTimestamp(createdAt: Date | string | number): number {
  const time = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return Number.isFinite(time) ? time : NaN;
}

/**
 * Milliseconds left in the edit window. `0` once it has closed, and `0` for an
 * unreadable `createdAt` so callers fail closed rather than granting access.
 */
export function expenseEditWindowRemainingMs(
  createdAt: Date | string | number,
  now: number = Date.now()
): number {
  const created = toTimestamp(createdAt);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, created + EXPENSE_EDIT_WINDOW_MS - now);
}

/** Whether the given role may still edit/delete an expense created at `createdAt`. */
export function canModifyExpense(
  role: string | null | undefined,
  createdAt: Date | string | number,
  now: number = Date.now()
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return expenseEditWindowRemainingMs(createdAt, now) > 0;
}

/** Short human hint for the remaining window, e.g. "5h 12m left to edit". */
export function formatExpenseEditWindowRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '';
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return `${parts} left to edit or delete`;
}
