import { prisma } from '@/lib/db';
import type { NotificationPriority, NotificationType, Prisma } from '@prisma/client';
import { buildPrismaCylinderVariantWhere, parseCylinderVariantKey } from '@/lib/cylinder-variant-key';
import { getCapacityFromTypeString, getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

type Priority = NotificationPriority;

/**
 * Strip HTML tags / control chars and cap length so untrusted input
 * (customer/vendor names, free-text descriptions) cannot store XSS or
 * binary payloads in the notification body. Pairs with the toast renderer
 * which uses `textContent`, but we belt-and-suspenders this at write time
 * for email/push consumers as well.
 */
function sanitizeNotificationField(input: unknown, max: number): string {
  if (input === null || input === undefined) return '';
  let str = String(input);
  str = str.replace(/<[^>]*>/g, '');
  // eslint-disable-next-line no-control-regex
  str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  str = str.trim();
  if (str.length > max) str = str.slice(0, max);
  return str;
}

interface NotifySuperAdminsInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  priority?: Priority;
  /**
   * Active branch when the event happened (from `x-region-id` / cookie).
   * Appends "— in Branch Name (CODE)" to the message and stores `regionId` on the row.
   */
  regionId?: string | null;
  /**
   * When provided, this user (the actor) is excluded from receiving the
   * notification – useful so a SUPER_ADMIN doesn't get notified about
   * activities they performed themselves.
   */
  excludeUserId?: string | null;
}

/** Resolve display label and append "— in …" to the message for in-app copy. */
export async function formatMessageWithRegion(
  message: string,
  regionId?: string | null
): Promise<{ message: string; regionName: string | null; regionCode: string | null }> {
  if (!regionId) {
    return { message, regionName: null, regionCode: null };
  }
  const r = await prisma.region.findUnique({
    where: { id: regionId },
    select: { name: true, code: true },
  });
  if (!r) {
    return { message, regionName: null, regionCode: null };
  }
  const label = r.code ? `${r.name} (${r.code})` : r.name;
  return {
    message: `${message} — in ${label}`,
    regionName: r.name,
    regionCode: r.code ?? null,
  };
}

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const;
const ADMIN_ROLE = 'ADMIN' as const;

async function getSuperAdminUserIds(excludeUserId?: string | null): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: {
      role: SUPER_ADMIN_ROLE,
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

/**
 * Recipients for operational alerts (e.g. low stock):
 * - all active SUPER_ADMINs
 * - active ADMINs with access to the event's branch (primary or userRegions)
 * - if no regionId, all active ADMINs
 */
async function getAdminAndSuperAdminUserIds(opts: {
  excludeUserId?: string | null;
  regionId?: string | null;
}): Promise<string[]> {
  const exclude = opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {};

  const [superAdmins, admins] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: SUPER_ADMIN_ROLE,
        isActive: true,
        ...exclude,
      },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: {
        role: ADMIN_ROLE,
        isActive: true,
        ...exclude,
        ...(opts.regionId
          ? {
              OR: [
                { regionId: opts.regionId },
                { userRegions: { some: { regionId: opts.regionId } } },
              ],
            }
          : {}),
      },
      select: { id: true },
    }),
  ]);

  return Array.from(new Set([...superAdmins, ...admins].map((u) => u.id)));
}

/**
 * Create one notification row per SUPER_ADMIN recipient, attaching an optional
 * deep link so the client can navigate directly to the relevant page.
 */
export async function notifySuperAdmins(input: NotifySuperAdminsInput) {
  try {
    const recipientIds = await getSuperAdminUserIds(input.excludeUserId ?? null);
    if (recipientIds.length === 0) return [];

    // Always strip control characters / HTML before persisting. Title and
    // message can come from arbitrary user activity (e.g. customer name in
    // an "imported customer" log) so we treat them as untrusted.
    const safeTitle = sanitizeNotificationField(input.title, 200);
    const safeInputMessage = sanitizeNotificationField(input.message, 2000);

    const { message: finalMessage, regionName, regionCode } = await formatMessageWithRegion(
      safeInputMessage,
      input.regionId
    );
    const meta: Record<string, unknown> = { ...(input.metadata ?? {}) };
    if (input.regionId) {
      meta.regionId = input.regionId;
      if (regionName) meta.regionName = regionName;
      if (regionCode) meta.regionCode = regionCode;
    }
    const metadata = Object.keys(meta).length > 0 ? JSON.stringify(meta) : null;

    const created = await prisma.$transaction(
      recipientIds.map((userId) =>
        prisma.notification.create({
          data: {
            type: input.type,
            title: safeTitle,
            message: finalMessage,
            priority: input.priority ?? 'MEDIUM',
            link: input.link ?? null,
            metadata,
            userId,
            regionId: input.regionId ?? null,
          },
        }),
      ),
    );
    return created;
  } catch (error) {
    console.error('[superAdminNotifier] Failed to notify super admins:', error);
    return [];
  }
}

/**
 * Notify ADMIN + SUPER_ADMIN users (branch-scoped for ADMINs when regionId is set).
 * Used for operational alerts like low inventory.
 */
export async function notifyAdminsAndSuperAdmins(input: NotifySuperAdminsInput) {
  try {
    const recipientIds = await getAdminAndSuperAdminUserIds({
      excludeUserId: input.excludeUserId ?? null,
      regionId: input.regionId ?? null,
    });
    if (recipientIds.length === 0) return [];

    const safeTitle = sanitizeNotificationField(input.title, 200);
    const safeInputMessage = sanitizeNotificationField(input.message, 2000);

    const { message: finalMessage, regionName, regionCode } = await formatMessageWithRegion(
      safeInputMessage,
      input.regionId
    );
    const meta: Record<string, unknown> = { ...(input.metadata ?? {}) };
    if (input.regionId) {
      meta.regionId = input.regionId;
      if (regionName) meta.regionName = regionName;
      if (regionCode) meta.regionCode = regionCode;
    }
    const metadata = Object.keys(meta).length > 0 ? JSON.stringify(meta) : null;

    const created = await prisma.$transaction(
      recipientIds.map((userId) =>
        prisma.notification.create({
          data: {
            type: input.type,
            title: safeTitle,
            message: finalMessage,
            priority: input.priority ?? 'MEDIUM',
            link: input.link ?? null,
            metadata,
            userId,
            regionId: input.regionId ?? null,
          },
        }),
      ),
    );
    return created;
  } catch (error) {
    console.error('[superAdminNotifier] Failed to notify admins:', error);
    return [];
  }
}

interface UserActivityNotificationInput {
  actorId: string;
  actorName: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  priority?: Priority;
  /** Active region for this request (pass `getActiveRegionId(request)` from API routes). */
  regionId?: string | null;
}

/**
 * Notify all SUPER_ADMINs about a system-user activity (transaction, CRUD, …)
 * The actor themselves is automatically excluded.
 */
export async function notifyUserActivity(input: UserActivityNotificationInput) {
  return notifySuperAdmins({
    type: 'USER_ACTIVITY',
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    metadata: { actorId: input.actorId, actorName: input.actorName, ...(input.metadata ?? {}) },
    priority: input.priority ?? 'MEDIUM',
    excludeUserId: input.actorId,
    regionId: input.regionId ?? null,
  });
}

// ---------------------------------------------------------------------------
// Low stock – idempotent helpers
// ---------------------------------------------------------------------------

const LOW_CYLINDER_THRESHOLD = 10;
const LOW_ACCESSORY_THRESHOLD = 10;

/**
 * Stable key fragments inside `metadata` (string column). We use
 * `contains` so keys must be unique per (cylinderType × region) or
 * (accessory id × region).
 */
function lowStockCylinderMarker(cylinderType: string, regionScope: string | null | undefined) {
  const encT = encodeURIComponent(cylinderType);
  if (regionScope === undefined) {
    return `LOWSTOCK_CYL|ALL|${encT}`;
  }
  const r = regionScope === null ? 'null' : regionScope;
  return `LOWSTOCK_CYL|${r}|${encT}`;
}

function lowStockCylinderVariantMarker(variantKey: string, regionScope: string | null | undefined) {
  const encK = encodeURIComponent(variantKey);
  if (regionScope === undefined) {
    return `LOWSTOCK_CYLVK|ALL|${encK}`;
  }
  const r = regionScope === null ? 'null' : regionScope;
  return `LOWSTOCK_CYLVK|${r}|${encK}`;
}

function formatCylinderVariantLabel(variantKey: string): string {
  const parsed = parseCylinderVariantKey(variantKey);
  if (!parsed) return variantKey;
  const cap = parsed.capacity ?? getCapacityFromTypeString(parsed.cylinderType);
  if (parsed.normalizedTypeNameLower && parsed.normalizedTypeNameLower !== 'null') {
    const tn = parsed.normalizedTypeNameLower.replace(/\b\w/g, (c) => c.toUpperCase());
    return `${tn} (${cap}kg)`;
  }
  return `${getCylinderTypeDisplayName(parsed.cylinderType)} (${cap}kg)`;
}

function lowStockAccessoryMarker(itemId: string, regionId: string | null) {
  const r = regionId === null ? 'null' : regionId;
  return `LOWSTOCK_ACC|${r}|${itemId}`;
}

async function hasOpenLowStockNotification(marker: string): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: {
      type: 'LOW_INVENTORY',
      isRead: false,
      metadata: { contains: marker },
    },
    select: { id: true },
  });
  return !!existing;
}

async function clearResolvedLowStockNotifications(marker: string) {
  await prisma.notification.deleteMany({
    where: {
      type: 'LOW_INVENTORY',
      isRead: false,
      metadata: { contains: marker },
    },
  });
}

/**
 * Check FULL cylinder stock for a given type in one branch and notify
 * ADMIN + SUPER_ADMIN when the count drops to the threshold or below.
 * Idempotent – one open alert per (cylinderType × region) until read or
 * stock recovers.
 *
 * @param regionScope - Branch: pass `getActiveRegionId(request)` (string). If
 *   `undefined`, counts across all regions (legacy; avoid in new code).
 *   If `null`, only cylinders with `regionId: null` are counted.
 */
export async function checkAndNotifyLowCylinderStock(
  cylinderType: string,
  regionScope?: string | null
) {
  if (!cylinderType) return;
  try {
    // Variant-aware: when passed a compound variantKey (type|||capacity|||typename),
    // alert on that specific variant so Plastic 15kg and Standard 15kg don't collapse.
    if (cylinderType.includes('|||')) {
      const variantKey = cylinderType;
      const parsed = parseCylinderVariantKey(variantKey);
      if (!parsed?.cylinderType) return;

      const where: Prisma.CylinderWhereInput = {
        ...buildPrismaCylinderVariantWhere(parsed.cylinderType, variantKey),
        currentStatus: 'FULL',
      };
      if (regionScope !== undefined) {
        where.regionId = regionScope;
      }

      const count = await prisma.cylinder.count({ where });
      const marker = lowStockCylinderVariantMarker(variantKey, regionScope);

      if (count > LOW_CYLINDER_THRESHOLD) {
        await clearResolvedLowStockNotifications(marker);
        return;
      }
      if (await hasOpenLowStockNotification(marker)) return;

      const notifyRegionId: string | null | undefined =
        regionScope === undefined ? undefined : (regionScope as string | null);
      const friendly = formatCylinderVariantLabel(variantKey);

      await notifyAdminsAndSuperAdmins({
        type: 'LOW_INVENTORY',
        title: 'Low Cylinder Stock',
        message: `Only ${count} FULL ${friendly} cylinders left in inventory. Please restock soon.`,
        priority: 'URGENT',
        link: `/inventory/cylinders?variantKey=${encodeURIComponent(variantKey)}&status=FULL`,
        regionId: notifyRegionId,
        metadata: {
          kind: 'cylinder',
          cylinderType: parsed.cylinderType,
          cylinderVariantKey: variantKey,
          count,
          threshold: LOW_CYLINDER_THRESHOLD,
          marker,
          ...(regionScope === undefined
            ? { scope: 'all_regions' as const }
            : { regionId: regionScope }),
        },
      });
      return;
    }

    const where: Prisma.CylinderWhereInput = {
      cylinderType,
      currentStatus: 'FULL',
    };
    if (regionScope !== undefined) {
      where.regionId = regionScope;
    }

    const count = await prisma.cylinder.count({ where });

    const marker = lowStockCylinderMarker(cylinderType, regionScope);

    if (count > LOW_CYLINDER_THRESHOLD) {
      await clearResolvedLowStockNotifications(marker);
      return;
    }

    if (await hasOpenLowStockNotification(marker)) return;

    const sample = await prisma.cylinder.findFirst({
      where,
      select: { typeName: true, capacity: true },
    });
    const cap = Number(sample?.capacity ?? getCapacityFromTypeString(cylinderType));
    const capacityNote = Number.isFinite(cap) && cap > 0 ? ` (${cap}kg)` : '';
    // For legacy enum-only notifications, prefer human display names instead of raw enums
    // like "CYLINDER_18KG" → "Cylinder (18kg)".
    const baseLabel = sample?.typeName?.trim()
      ? sample.typeName.trim()
      : getCylinderTypeDisplayName(cylinderType);
    const friendly = `${baseLabel}${capacityNote}`;

    const notifyRegionId: string | null | undefined =
      regionScope === undefined ? undefined : (regionScope as string | null);

    await notifyAdminsAndSuperAdmins({
      type: 'LOW_INVENTORY',
      title: 'Low Cylinder Stock',
      message: `Only ${count} FULL ${friendly} cylinders left in inventory. Please restock soon.`,
      priority: 'URGENT',
      link: `/inventory/cylinders?type=${encodeURIComponent(cylinderType)}&status=FULL`,
      regionId: notifyRegionId,
      metadata: {
        kind: 'cylinder',
        cylinderType,
        count,
        threshold: LOW_CYLINDER_THRESHOLD,
        marker,
        ...(regionScope === undefined
          ? { scope: 'all_regions' as const }
          : { regionId: regionScope }),
      },
    });
  } catch (error) {
    console.error('[superAdminNotifier] Cylinder low-stock check failed:', error);
  }
}

/**
 * Re-check low stock for the given types within the active branch
 * (transaction / inventory context).
 */
export async function checkAllCylinderTypesForLowStock(
  types?: Array<
    | string
    | { cylinderType: string; cylinderVariantKey?: string | null }
    | { variantKey: string }
  >,
  activeRegionId?: string | null
) {
  try {
    if (types && types.length > 0) {
      const normalized: string[] = [];
      for (const t of types) {
        if (!t) continue;
        if (typeof t === 'string') {
          normalized.push(t);
          continue;
        }
        const anyT: any = t;
        if (typeof anyT.variantKey === 'string' && anyT.variantKey.trim()) {
          normalized.push(anyT.variantKey.trim());
          continue;
        }
        if (typeof anyT.cylinderVariantKey === 'string' && anyT.cylinderVariantKey.trim()) {
          normalized.push(anyT.cylinderVariantKey.trim());
          continue;
        }
        if (typeof anyT.cylinderType === 'string' && anyT.cylinderType.trim()) {
          normalized.push(anyT.cylinderType.trim());
        }
      }

      const distinctTypes = Array.from(new Set(normalized.filter(Boolean)));
      for (const t of distinctTypes) {
        await checkAndNotifyLowCylinderStock(t, activeRegionId);
      }
      return;
    }

    const groups = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'typeName', 'capacity', 'regionId'],
      where: { currentStatus: 'FULL' },
      _count: { _all: true },
    });
    for (const g of groups) {
      const variantKey = `${g.cylinderType}|||${g.capacity?.toString() ?? 'null'}|||${
        g.typeName ? String(g.typeName).toLowerCase().trim() : 'null'
      }`;
      await checkAndNotifyLowCylinderStock(variantKey, g.regionId);
    }
  } catch (error) {
    console.error('[superAdminNotifier] Cylinder bulk low-stock check failed:', error);
  }
}

/**
 * Check a custom accessory item's stock. If quantity has dropped to
 * threshold or below, fire one URGENT notification for ADMIN + SUPER_ADMIN.
 */
export async function checkAndNotifyLowAccessoryStock(itemId: string) {
  if (!itemId) return;
  try {
    const item = await prisma.customItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
        type: true,
        quantity: true,
        isActive: true,
        regionId: true,
      },
    });
    if (!item || !item.isActive) return;

    const marker = lowStockAccessoryMarker(itemId, item.regionId ?? null);

    if (item.quantity > LOW_ACCESSORY_THRESHOLD) {
      await clearResolvedLowStockNotifications(marker);
      return;
    }

    if (await hasOpenLowStockNotification(marker)) return;

    await notifyAdminsAndSuperAdmins({
      type: 'LOW_INVENTORY',
      title: 'Low Accessory Stock',
      message: `Only ${item.quantity} units left of ${item.name} – ${item.type}. Please restock soon.`,
      priority: 'URGENT',
      link: `/inventory/accessories?category=${encodeURIComponent(item.name)}&item=${encodeURIComponent(item.id)}`,
      regionId: item.regionId,
      metadata: {
        kind: 'accessory',
        itemId: item.id,
        category: item.name,
        type: item.type,
        quantity: item.quantity,
        threshold: LOW_ACCESSORY_THRESHOLD,
        regionId: item.regionId,
      },
    });
  } catch (error) {
    console.error('[superAdminNotifier] Accessory low-stock check failed:', error);
  }
}

/**
 * Check low-stock for a list of accessory items affected by a transaction.
 * Looks them up by (category, itemType) which matches `CustomItem.name` and
 * `CustomItem.type` respectively.
 */
export async function checkAccessoriesForLowStock(
  items: Array<{ category: string; itemType: string }>,
  regionId?: string | null,
) {
  try {
    if (!items || items.length === 0) return;

    const matches = await prisma.customItem.findMany({
      where: {
        isActive: true,
        OR: items.map((i) => ({ name: i.category, type: i.itemType })),
        ...(regionId !== undefined ? { regionId } : {}),
      },
      select: { id: true },
    });

    for (const m of matches) {
      await checkAndNotifyLowAccessoryStock(m.id);
    }
  } catch (error) {
    console.error('[superAdminNotifier] Accessories low-stock bulk check failed:', error);
  }
}

export const __thresholds = {
  LOW_CYLINDER_THRESHOLD,
  LOW_ACCESSORY_THRESHOLD,
};
