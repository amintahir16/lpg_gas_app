import { prisma } from '@/lib/db';
import { regionScopedWhere } from '@/lib/region';

interface CacheEntry {
  dateKey: string; // "YYYY-MM-DD"
  activeCustomerIds: Set<string>;
}

// In-memory daily cache keyed by regionId (or "__ALL__")
const dailyActiveCustomerCache = new Map<string, CacheEntry>();

/**
 * Returns the Set of B2B customer IDs who have had a transaction in the last 7 days.
 * This query runs at most ONCE PER DAY per region, preserving database quota.
 */
export async function getDailyActiveB2BCustomerIds(regionId?: string | null): Promise<Set<string>> {
  const todayKey = new Date().toISOString().slice(0, 10); // e.g. "2026-08-20"
  const cacheKey = regionId || '__ALL__';

  const cached = dailyActiveCustomerCache.get(cacheKey);
  if (cached && cached.dateKey === todayKey) {
    return cached.activeCustomerIds;
  }

  // Calculate 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Single index-backed query using compound index [regionId, date] with distinct customerId
  const recentTransactions = await prisma.b2BTransaction.findMany({
    where: {
      date: { gte: sevenDaysAgo },
      voided: false,
      ...regionScopedWhere(regionId),
    },
    select: { customerId: true },
    distinct: ['customerId'],
  });

  const activeCustomerIds = new Set(recentTransactions.map((t) => t.customerId));
  dailyActiveCustomerCache.set(cacheKey, {
    dateKey: todayKey,
    activeCustomerIds,
  });

  return activeCustomerIds;
}

/**
 * Optimistically marks a customer as active in the daily cache when a new transaction occurs.
 */
export function recordB2BCustomerActivity(customerId: string, regionId?: string | null) {
  const cacheKey = regionId || '__ALL__';
  const cached = dailyActiveCustomerCache.get(cacheKey);
  if (cached) {
    cached.activeCustomerIds.add(customerId);
  }
}
