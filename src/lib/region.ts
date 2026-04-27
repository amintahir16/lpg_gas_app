/**
 * Region (multi-branch) helpers.
 *
 * The selected region flows through the app via:
 *   1. `flamora_region_id` HTTP-only cookie (set on /select-region or admin login)
 *   2. `x-region-id` request header (injected by middleware in `src/proxy.ts`)
 *
 * API routes should read the active region with `getActiveRegionId(request)` and
 * use the `regionScopedWhere` / `withRegionScope` helpers to scope reads/writes.
 */

import type { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/db';

export const REGION_COOKIE_NAME = 'flamora_region_id';
export const REGION_HEADER_NAME = 'x-region-id';

/** Read the active region id from an incoming `NextRequest` (preferred for API routes). */
export function getActiveRegionId(request: NextRequest): string | null {
  const headerValue = request.headers.get(REGION_HEADER_NAME);
  if (headerValue && headerValue.trim().length > 0) {
    return headerValue;
  }
  const cookie = request.cookies.get(REGION_COOKIE_NAME);
  return cookie?.value || null;
}

/** Read the active region id inside a server component / server action. */
export async function getActiveRegionIdServer(): Promise<string | null> {
  try {
    const headerStore = await headers();
    const headerValue = headerStore.get(REGION_HEADER_NAME);
    if (headerValue) return headerValue;
  } catch {
    // headers() not available in this context; fall back to cookies
  }
  try {
    const cookieStore = await cookies();
    return cookieStore.get(REGION_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Build a Prisma `where` fragment that scopes a query to the active region.
 *
 * - If a regionId is provided, returns `{ regionId }`.
 * - If no regionId is provided (e.g. SUPER_ADMIN viewing "all regions"),
 *   returns `{}` so the caller can spread it without filtering.
 *
 * Example:
 *   const customers = await prisma.customer.findMany({
 *     where: { isActive: true, ...regionScopedWhere(regionId) },
 *   });
 */
export function regionScopedWhere(regionId: string | null | undefined): Record<string, string> {
  if (!regionId) return {};
  return { regionId };
}

/**
 * Inject `regionId` into a `data` object for create operations.
 *
 * Example:
 *   await prisma.customer.create({ data: withRegionScope({ name: '...' }, regionId) });
 */
export function withRegionScope<T extends Record<string, unknown>>(
  data: T,
  regionId: string | null | undefined
): T & { regionId?: string } {
  if (!regionId) return data;
  return { ...data, regionId };
}

export type ApiUserContext = {
  userId: string;
  userRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'VENDOR' | string;
  regionId: string | null;
};

/** Pull the user context (id, role, region) out of headers injected by proxy.ts. */
export function getApiContext(request: NextRequest): ApiUserContext {
  return {
    userId: request.headers.get('x-user-id') || '',
    userRole: request.headers.get('x-user-role') || '',
    regionId: getActiveRegionId(request),
  };
}

/**
 * For admin pages: SUPER_ADMIN sees data for the currently selected region only
 * (since they explicitly chose one on /select-region). ADMIN is locked to their
 * assigned region, also delivered via the same cookie/header pipeline.
 */
export function requireRegionId(ctx: ApiUserContext): string {
  if (!ctx.regionId) {
    throw new Error(
      'No region selected. Please choose a region from /select-region first.'
    );
  }
  return ctx.regionId;
}

/**
 * Resolve the full set of region ids an ADMIN (or SUPER_ADMIN) can access.
 *
 * For ADMINs the union is `[user.regionId] ∪ user.userRegions[].regionId`,
 * de-duplicated and filtered to active regions. SUPER_ADMINs aren't restricted
 * here — callers should fall back to "all active regions" for them.
 *
 * Returns `{ primary, ids }` where `primary` is the User.regionId (default /
 * auto-select target) and `ids` is the canonical accessible set with the
 * primary first when present.
 */
export async function getAccessibleRegionsForUser(userId: string): Promise<{
  primary: string | null;
  ids: string[];
}> {
  if (!userId) return { primary: null, ids: [] };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      regionId: true,
      region: { select: { id: true, isActive: true } },
      userRegions: {
        select: {
          regionId: true,
          region: { select: { id: true, isActive: true } },
        },
      },
    },
  });
  if (!user) return { primary: null, ids: [] };

  const primary = user.region && user.region.isActive ? user.region.id : null;
  const additional = user.userRegions
    .filter((ur) => ur.region && ur.region.isActive)
    .map((ur) => ur.regionId);

  const seen = new Set<string>();
  const ids: string[] = [];
  if (primary) {
    seen.add(primary);
    ids.push(primary);
  }
  for (const rid of additional) {
    if (!seen.has(rid)) {
      seen.add(rid);
      ids.push(rid);
    }
  }
  return { primary, ids };
}
