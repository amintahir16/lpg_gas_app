import { prisma } from '@/lib/db';
import { regionScopedWhere } from '@/lib/region';

interface CacheEntry {
  dateKey: string; // "YYYY-MM-DD"
  activeCustomerIds: Set<string>;
  cylinderReturnCustomerIds: Set<string>;
  /** Customers who have at least one cylinder delivery on the ledger. */
  customersWithCylinderIssues: Set<string>;
  /** Customers who still hold a cylinder that was issued more than 7 days ago. */
  agedOutstandingCustomerIds: Set<string>;
}

export interface B2BActivityStatusSets {
  activeCustomerIds: Set<string>;
  cylinderReturnCustomerIds: Set<string>;
  customersWithCylinderIssues: Set<string>;
  agedOutstandingCustomerIds: Set<string>;
}

export interface CylinderMovement {
  customerId: string;
  at: number;
  kind: 'issue' | 'return';
  qty: number;
}

// In-memory daily cache keyed by regionId (or "__ALL__") stored on globalThis to persist across Next.js route handlers
const globalForB2BCache = globalThis as unknown as {
  dailyActiveCustomerCache?: Map<string, CacheEntry>;
};

const dailyActiveCustomerCache =
  globalForB2BCache.dailyActiveCustomerCache ?? new Map<string, CacheEntry>();

globalForB2BCache.dailyActiveCustomerCache = dailyActiveCustomerCache;

/**
 * Returns Sets of B2B customer IDs who have had:
 * 1. Any transaction in the last 7 days (activeCustomerIds)
 * 2. A cylinder return (RETURN_EMPTY, BUYBACK, or SALE with returns) in the last 7 days (cylinderReturnCustomerIds)
 * 3. A cylinder delivery on the ledger (customersWithCylinderIssues)
 * 4. A cylinder still outstanding that was issued more than 7 days ago (agedOutstandingCustomerIds)
 * This query runs at most ONCE PER DAY per region, preserving database quota.
 */
export async function getDailyB2BCustomerActivityAndReturns(
  regionId?: string | null
): Promise<B2BActivityStatusSets> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = regionId || '__ALL__';

  const cached = dailyActiveCustomerCache.get(cacheKey);
  if (
    cached &&
    cached.dateKey === todayKey &&
    cached.customersWithCylinderIssues &&
    cached.agedOutstandingCustomerIds
  ) {
    return {
      activeCustomerIds: cached.activeCustomerIds,
      cylinderReturnCustomerIds: cached.cylinderReturnCustomerIds,
      customersWithCylinderIssues: cached.customersWithCylinderIssues,
      agedOutstandingCustomerIds: cached.agedOutstandingCustomerIds,
    };
  }

  // Calculate 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Single batch of index-backed queries running once per day
  const [recentTransactions, recentReturns, cylinderTransactions] = await Promise.all([
    prisma.b2BTransaction.findMany({
      where: {
        date: { gte: sevenDaysAgo },
        voided: false,
        ...regionScopedWhere(regionId),
      },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
    prisma.b2BTransaction.findMany({
      where: {
        date: { gte: sevenDaysAgo },
        voided: false,
        ...regionScopedWhere(regionId),
        OR: [
          { transactionType: { in: ['RETURN_EMPTY', 'BUYBACK'] } },
          { items: { some: { returnedCondition: { not: null } } } },
        ],
      },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
    prisma.b2BTransaction.findMany({
      where: {
        voided: false,
        transactionType: { in: ['SALE', 'RETURN_EMPTY', 'BUYBACK'] },
        ...regionScopedWhere(regionId),
      },
      select: {
        customerId: true,
        date: true,
        time: true,
        transactionType: true,
        items: {
          select: {
            quantity: true,
            cylinderType: true,
            returnedCondition: true,
          },
        },
      },
    }),
  ]);

  const activeCustomerIds = new Set(recentTransactions.map((t) => t.customerId));
  const cylinderReturnCustomerIds = new Set(recentReturns.map((t) => t.customerId));
  const { customersWithCylinderIssues, agedOutstandingCustomerIds } = classifyCylinderIssueAge(
    buildCylinderMovements(cylinderTransactions),
    sevenDaysAgo.getTime(),
  );

  dailyActiveCustomerCache.set(cacheKey, {
    dateKey: todayKey,
    activeCustomerIds,
    cylinderReturnCustomerIds,
    customersWithCylinderIssues,
    agedOutstandingCustomerIds,
  });

  return {
    activeCustomerIds,
    cylinderReturnCustomerIds,
    customersWithCylinderIssues,
    agedOutstandingCustomerIds,
  };
}

/**
 * True when the customer still holds cylinders that have been out for more than 7 days
 * and has not returned a cylinder in that window.
 * A delivery history starts the clock at the issue date, so a first delivery
 * does not show 7d+ No Return until those cylinders are actually a week old.
 * Customers with dues but no delivery on the ledger keep the previous rule.
 */
export function hasStagnantCylinderHoldings(
  customerId: string,
  hasCylinderDues: boolean,
  sets: Pick<
    B2BActivityStatusSets,
    'cylinderReturnCustomerIds' | 'customersWithCylinderIssues' | 'agedOutstandingCustomerIds'
  >,
): boolean {
  if (!hasCylinderDues) return false;
  if (sets.cylinderReturnCustomerIds.has(customerId)) return false;
  if (!sets.customersWithCylinderIssues.has(customerId)) return true;
  return sets.agedOutstandingCustomerIds.has(customerId);
}

function movementInstant(time: Date | null | undefined, date: Date): number {
  const timeMs = time ? new Date(time).getTime() : NaN;
  if (Number.isFinite(timeMs)) return timeMs;
  return new Date(date).getTime();
}

function isCylinderReturn(
  transactionType: string,
  returnedCondition: string | null | undefined,
): boolean {
  if (transactionType === 'RETURN_EMPTY' || transactionType === 'BUYBACK') return true;
  return returnedCondition != null && returnedCondition !== '';
}

function buildCylinderMovements(
  transactions: Array<{
    customerId: string;
    date: Date;
    time: Date | null;
    transactionType: string;
    items: Array<{
      quantity: { toString(): string } | number | string | null;
      cylinderType: string | null;
      returnedCondition: string | null;
    }>;
  }>,
): CylinderMovement[] {
  const movements: CylinderMovement[] = [];

  for (const tx of transactions) {
    const at = movementInstant(tx.time, tx.date);
    if (!Number.isFinite(at)) continue;

    for (const item of tx.items) {
      if (!item.cylinderType) continue;
      const qty = Number(item.quantity ?? 0);
      if (!(qty > 0)) continue;

      const kind = isCylinderReturn(tx.transactionType, item.returnedCondition) ? 'return' : 'issue';
      if (kind === 'return' || tx.transactionType === 'SALE') {
        movements.push({ customerId: tx.customerId, at, kind, qty });
      }
    }
  }

  return movements;
}

/**
 * FIFO: a return clears the oldest cylinders still out.
 * Aged means at least one unmatched delivery is older than `olderThanMs`.
 */
export function classifyCylinderIssueAge(
  movements: CylinderMovement[],
  olderThanMs: number,
): Pick<B2BActivityStatusSets, 'customersWithCylinderIssues' | 'agedOutstandingCustomerIds'> {
  const customersWithCylinderIssues = new Set<string>();
  const agedOutstandingCustomerIds = new Set<string>();
  const byCustomer = new Map<string, CylinderMovement[]>();

  for (const movement of movements) {
    if (!(movement.qty > 0) || !movement.customerId) continue;
    const list = byCustomer.get(movement.customerId);
    if (list) list.push(movement);
    else byCustomer.set(movement.customerId, [movement]);
  }

  for (const [customerId, list] of byCustomer) {
    list.sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      if (a.kind === b.kind) return 0;
      return a.kind === 'return' ? -1 : 1;
    });

    const outstanding: { at: number; qty: number }[] = [];
    let sawIssue = false;

    for (const movement of list) {
      if (movement.kind === 'issue') {
        sawIssue = true;
        outstanding.push({ at: movement.at, qty: movement.qty });
        continue;
      }

      let remaining = movement.qty;
      while (remaining > 0 && outstanding.length > 0) {
        const head = outstanding[0];
        const take = Math.min(head.qty, remaining);
        head.qty -= take;
        remaining -= take;
        if (head.qty <= 0) outstanding.shift();
      }
    }

    if (sawIssue) customersWithCylinderIssues.add(customerId);
    if (outstanding.some((lot) => lot.at < olderThanMs)) {
      agedOutstandingCustomerIds.add(customerId);
    }
  }

  return { customersWithCylinderIssues, agedOutstandingCustomerIds };
}

/**
 * Returns the Set of B2B customer IDs who have had a transaction in the last 7 days.
 * Kept for backward compatibility with existing callers.
 */
export async function getDailyActiveB2BCustomerIds(regionId?: string | null): Promise<Set<string>> {
  const res = await getDailyB2BCustomerActivityAndReturns(regionId);
  return res.activeCustomerIds;
}

/**
 * Optimistically marks a customer as active in the daily cache when a new transaction occurs.
 */
export function recordB2BCustomerActivity(customerId: string, regionId?: string | null) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = regionId || '__ALL__';

  const entry = dailyActiveCustomerCache.get(cacheKey);
  if (entry && entry.dateKey === todayKey) {
    entry.activeCustomerIds.add(customerId);
  }

  if (regionId) {
    const allEntry = dailyActiveCustomerCache.get('__ALL__');
    if (allEntry && allEntry.dateKey === todayKey) {
      allEntry.activeCustomerIds.add(customerId);
    }
  }

  for (const e of dailyActiveCustomerCache.values()) {
    if (e.dateKey === todayKey) {
      e.activeCustomerIds.add(customerId);
    }
  }
}

/**
 * Marks a same-day cylinder delivery on the daily cache.
 * The issue is not 7 days old, so it is not added to the aged set.
 * Older outstanding cylinders already in that set stay there.
 */
export function recordB2BCustomerCylinderIssue(customerId: string, regionId?: string | null) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = regionId || '__ALL__';

  const mark = (entry: CacheEntry | undefined) => {
    if (!entry || entry.dateKey !== todayKey || !entry.customersWithCylinderIssues) return;
    entry.customersWithCylinderIssues.add(customerId);
  };

  mark(dailyActiveCustomerCache.get(cacheKey));
  if (regionId) mark(dailyActiveCustomerCache.get('__ALL__'));

  for (const entry of dailyActiveCustomerCache.values()) {
    mark(entry);
  }
}

/**
 * Optimistically marks a customer as having returned cylinders in the daily cache when a return occurs.
 */
export function recordB2BCustomerCylinderReturn(customerId: string, regionId?: string | null) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = regionId || '__ALL__';

  const entry = dailyActiveCustomerCache.get(cacheKey);
  if (entry && entry.dateKey === todayKey) {
    entry.activeCustomerIds.add(customerId);
    entry.cylinderReturnCustomerIds.add(customerId);
  }

  if (regionId) {
    const allEntry = dailyActiveCustomerCache.get('__ALL__');
    if (allEntry && allEntry.dateKey === todayKey) {
      allEntry.activeCustomerIds.add(customerId);
      allEntry.cylinderReturnCustomerIds.add(customerId);
    }
  }

  for (const e of dailyActiveCustomerCache.values()) {
    if (e.dateKey === todayKey) {
      e.activeCustomerIds.add(customerId);
      e.cylinderReturnCustomerIds.add(customerId);
    }
  }
}

/**
 * Invalidates cached active & return Sets for a region (or all regions),
 * ensuring the next query pulls fresh data without waiting 24 hours.
 */
export function invalidateB2BCustomerCache(regionId?: string | null) {
  if (regionId) {
    dailyActiveCustomerCache.delete(regionId);
    dailyActiveCustomerCache.delete('__ALL__');
  } else {
    dailyActiveCustomerCache.clear();
  }
}
