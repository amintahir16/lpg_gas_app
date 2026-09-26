import { prisma } from '@/lib/db';
import { regionScopedWhere } from '@/lib/region';

interface CacheEntry {
  dateKey: string; // "YYYY-MM-DD"
  activeCustomerIds: Set<string>;
  cylinderReturnCustomerIds: Set<string>;
}

export interface B2BActivityStatusSets {
  activeCustomerIds: Set<string>;
  cylinderReturnCustomerIds: Set<string>;
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
 * This query runs at most ONCE PER DAY per region, preserving database quota.
 */
export async function getDailyB2BCustomerActivityAndReturns(
  regionId?: string | null
): Promise<B2BActivityStatusSets> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = regionId || '__ALL__';

  const cached = dailyActiveCustomerCache.get(cacheKey);
  if (cached && cached.dateKey === todayKey) {
    return {
      activeCustomerIds: cached.activeCustomerIds,
      cylinderReturnCustomerIds: cached.cylinderReturnCustomerIds,
    };
  }

  // Calculate 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Single batch of index-backed queries running once per day
  const [recentTransactions, recentReturns] = await Promise.all([
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
  ]);

  const activeCustomerIds = new Set(recentTransactions.map((t) => t.customerId));
  const cylinderReturnCustomerIds = new Set(recentReturns.map((t) => t.customerId));

  dailyActiveCustomerCache.set(cacheKey, {
    dateKey: todayKey,
    activeCustomerIds,
    cylinderReturnCustomerIds,
  });

  return { activeCustomerIds, cylinderReturnCustomerIds };
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
