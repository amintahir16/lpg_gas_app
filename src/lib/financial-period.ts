/**
 * Shared financial period helpers for Day / Month / Year filtering.
 * Default period is Month to preserve existing monthly reporting behavior.
 */

export type FinancialPeriodMode = 'day' | 'month' | 'year';

export interface FinancialPeriodInput {
  period?: string | null;
  date?: string | null;
  month?: string | number | null;
  year?: string | number | null;
}

export interface ResolvedFinancialPeriod {
  period: FinancialPeriodMode;
  startDate: Date;
  endDate: Date;
  /** Calendar day YYYY-MM-DD when period === 'day' */
  date: string | null;
  month: number | null;
  year: number;
  label: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

function parseIntOr(value: string | number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a Date/ISO string as YYYY-MM-DD in the operator's local timezone (for `<input type="date">`). */
export function formatLocalDateInput(
  value: Date | string | null | undefined
): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return toLocalDateString(d);
}

/** Today's date as YYYY-MM-DD in the operator's local timezone. */
export function todayLocalDate(): string {
  return toLocalDateString(new Date());
}

/** Current local time as HH:MM for `<input type="time">`. */
export function nowLocalTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Combine a local YYYY-MM-DD date and HH:MM time into a Date in the
 * operator's timezone (avoids UTC midnight shifts from `new Date('YYYY-MM-DD')`).
 */
export function combineLocalDateAndTime(
  date: string | null | undefined,
  time: string | null | undefined
): Date {
  const dateStr =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? date.trim() : todayLocalDate();
  const rawTime = (time || '').trim();
  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(rawTime);
  const hours = timeMatch ? parseInt(timeMatch[1], 10) : new Date().getHours();
  const minutes = timeMatch ? parseInt(timeMatch[2], 10) : new Date().getMinutes();
  const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function parseLocalDate(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function normalizeFinancialPeriodMode(
  value: string | null | undefined
): FinancialPeriodMode {
  if (value === 'day' || value === 'year') return value;
  return 'month';
}

export function resolveFinancialPeriod(
  input: FinancialPeriodInput = {}
): ResolvedFinancialPeriod {
  const now = new Date();
  const period = normalizeFinancialPeriodMode(input.period);
  const year = parseIntOr(input.year, now.getFullYear());

  if (period === 'day') {
    const fallback = toLocalDateString(now);
    const parsed = parseLocalDate(input.date || fallback) || parseLocalDate(fallback)!;
    const startDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    const endDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
    const date = toLocalDateString(parsed);
    return {
      period,
      startDate,
      endDate,
      date,
      month: parsed.getMonth() + 1,
      year: parsed.getFullYear(),
      label: parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  if (period === 'year') {
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    return {
      period,
      startDate,
      endDate,
      date: null,
      month: null,
      year,
      label: String(year),
    };
  }

  // Default: month
  const month = Math.min(12, Math.max(1, parseIntOr(input.month, now.getMonth() + 1)));
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return {
    period: 'month',
    startDate,
    endDate,
    date: null,
    month,
    year,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
  };
}

export const FINANCIAL_PERIOD_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

export const FINANCIAL_MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({
  value: String(i + 1),
  label: name,
}));

export function financialYearOptions(span = 5): { value: string; label: string }[] {
  const current = new Date().getFullYear();
  return Array.from({ length: span }, (_, i) => {
    const y = current - 2 + i;
    return { value: String(y), label: String(y) };
  });
}

export interface FinancialChartBucket {
  name: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Chart windows that respect the selected period:
 * - day   → last 7 days ending on the selected day
 * - month → last 6 months ending on the selected month
 * - year  → all 12 months of the selected year
 */
export function getFinancialChartBuckets(
  resolved: ResolvedFinancialPeriod
): FinancialChartBucket[] {
  if (resolved.period === 'day') {
    const buckets: FinancialChartBucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(resolved.startDate);
      d.setDate(d.getDate() - i);
      const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      buckets.push({
        name: startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        startDate,
        endDate,
      });
    }
    return buckets;
  }

  if (resolved.period === 'year') {
    return Array.from({ length: 12 }, (_, m) => {
      const startDate = new Date(resolved.year, m, 1, 0, 0, 0, 0);
      const endDate = new Date(resolved.year, m + 1, 0, 23, 59, 59, 999);
      return {
        name: MONTH_NAMES[m].slice(0, 3),
        startDate,
        endDate,
      };
    });
  }

  // month — last 6 months ending at selected month
  const month = resolved.month || new Date().getMonth() + 1;
  const buckets: FinancialChartBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const anchor = new Date(resolved.year, month - 1 - i, 1);
    const startDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    buckets.push({
      name: `${MONTH_NAMES[startDate.getMonth()].slice(0, 3)} ${startDate.getFullYear()}`,
      startDate,
      endDate,
    });
  }
  return buckets;
}

export function chartDescriptionForPeriod(period: FinancialPeriodMode): string {
  if (period === 'day') return 'Last 7 days ending on selected day';
  if (period === 'year') return 'All months in the selected year';
  return 'Last 6 months ending on selected month';
}

export function buildFinancialPeriodQuery(params: {
  period: FinancialPeriodMode;
  date: string;
  month: number;
  year: number;
}): string {
  const q = new URLSearchParams({ period: params.period });
  if (params.period === 'day') {
    q.set('date', params.date);
  } else if (params.period === 'month') {
    q.set('month', String(params.month));
    q.set('year', String(params.year));
  } else {
    q.set('year', String(params.year));
  }
  return q.toString();
}

/** Month/year to use when recording a salary against the current filter. */
export function salaryPayTarget(resolved: ResolvedFinancialPeriod): { month: number; year: number } {
  if (resolved.period === 'year') {
    const now = new Date();
    const month = resolved.year === now.getFullYear() ? now.getMonth() + 1 : 1;
    return { month, year: resolved.year };
  }
  return {
    month: resolved.month || new Date().getMonth() + 1,
    year: resolved.year,
  };
}
