import { prisma } from '@/lib/db';
import type { NotificationPriority, NotificationType } from '@prisma/client';

type Priority = NotificationPriority;

interface NotifySuperAdminsInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  priority?: Priority;
  /**
   * When provided, this user (the actor) is excluded from receiving the
   * notification – useful so a SUPER_ADMIN doesn't get notified about
   * activities they performed themselves.
   */
  excludeUserId?: string | null;
}

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const;

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
 * Create one notification row per SUPER_ADMIN recipient, attaching an optional
 * deep link so the client can navigate directly to the relevant page.
 */
export async function notifySuperAdmins(input: NotifySuperAdminsInput) {
  try {
    const recipientIds = await getSuperAdminUserIds(input.excludeUserId ?? null);
    if (recipientIds.length === 0) return [];

    const metadata = input.metadata ? JSON.stringify(input.metadata) : null;
    const created = await prisma.$transaction(
      recipientIds.map((userId) =>
        prisma.notification.create({
          data: {
            type: input.type,
            title: input.title,
            message: input.message,
            priority: input.priority ?? 'MEDIUM',
            link: input.link ?? null,
            metadata,
            userId,
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

interface UserActivityNotificationInput {
  actorId: string;
  actorName: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  priority?: Priority;
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
  });
}

// ---------------------------------------------------------------------------
// Low stock – idempotent helpers
// ---------------------------------------------------------------------------

const LOW_CYLINDER_THRESHOLD = 5;
const LOW_ACCESSORY_THRESHOLD = 5;

/**
 * Stable key fragments stored inside the (string) metadata JSON. We use
 * substring search to detect existing unread notifications because the column
 * is `String?` rather than `Json`.
 */
const cylinderMarker = (cylinderType: string) =>
  `"kind":"cylinder","cylinderType":"${cylinderType}"`;
const accessoryMarker = (itemId: string) =>
  `"kind":"accessory","itemId":"${itemId}"`;

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
  // When stock recovers above threshold, drop unread alerts so the next dip
  // re-arms a fresh notification.
  await prisma.notification.deleteMany({
    where: {
      type: 'LOW_INVENTORY',
      isRead: false,
      metadata: { contains: marker },
    },
  });
}

/**
 * Check FULL cylinder stock for a given type and notify SUPER_ADMINs when
 * the count drops below the threshold. Idempotent – fires at most one open
 * alert per type until the alert is read or stock recovers.
 */
export async function checkAndNotifyLowCylinderStock(cylinderType: string) {
  if (!cylinderType) return;
  try {
    const count = await prisma.cylinder.count({
      where: { cylinderType, currentStatus: 'FULL' },
    });

    const marker = cylinderMarker(cylinderType);

    if (count >= LOW_CYLINDER_THRESHOLD) {
      await clearResolvedLowStockNotifications(marker);
      return;
    }

    if (await hasOpenLowStockNotification(marker)) return;

    // Pull a friendly type name when available
    const sample = await prisma.cylinder.findFirst({
      where: { cylinderType },
      select: { typeName: true, capacity: true },
    });
    const friendly =
      sample?.typeName ||
      cylinderType.replace(/_/g, ' ');
    const capacityNote = sample?.capacity ? ` (${Number(sample.capacity)}kg)` : '';

    await notifySuperAdmins({
      type: 'LOW_INVENTORY',
      title: 'Low Cylinder Stock',
      message: `Only ${count} FULL ${friendly}${capacityNote} cylinders left in inventory. Please restock soon.`,
      priority: 'URGENT',
      link: `/inventory/cylinders?type=${encodeURIComponent(cylinderType)}&status=FULL`,
      metadata: {
        kind: 'cylinder',
        cylinderType,
        count,
        threshold: LOW_CYLINDER_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('[superAdminNotifier] Cylinder low-stock check failed:', error);
  }
}

/**
 * Run a low-stock check for every distinct cylinder type that currently has
 * any FULL or recently-touched stock. Used after transactions where multiple
 * types may have been impacted.
 */
export async function checkAllCylinderTypesForLowStock(types?: string[]) {
  try {
    const distinctTypes = types && types.length > 0
      ? Array.from(new Set(types.filter(Boolean)))
      : (
          await prisma.cylinder.findMany({
            distinct: ['cylinderType'],
            select: { cylinderType: true },
          })
        ).map((c) => c.cylinderType);

    for (const t of distinctTypes) {
      await checkAndNotifyLowCylinderStock(t);
    }
  } catch (error) {
    console.error('[superAdminNotifier] Cylinder bulk low-stock check failed:', error);
  }
}

/**
 * Check a custom accessory item's stock. If quantity has dropped to
 * threshold or below, fire one URGENT notification for SUPER_ADMINs.
 */
export async function checkAndNotifyLowAccessoryStock(itemId: string) {
  if (!itemId) return;
  try {
    const item = await prisma.customItem.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, type: true, quantity: true, isActive: true },
    });
    if (!item || !item.isActive) return;

    const marker = accessoryMarker(itemId);

    if (item.quantity > LOW_ACCESSORY_THRESHOLD) {
      await clearResolvedLowStockNotifications(marker);
      return;
    }

    if (await hasOpenLowStockNotification(marker)) return;

    await notifySuperAdmins({
      type: 'LOW_INVENTORY',
      title: 'Low Accessory Stock',
      message: `Only ${item.quantity} units left of ${item.name} – ${item.type}. Please restock soon.`,
      priority: 'URGENT',
      link: `/inventory/custom-items?category=${encodeURIComponent(item.name)}&item=${encodeURIComponent(item.id)}`,
      metadata: {
        kind: 'accessory',
        itemId: item.id,
        category: item.name,
        type: item.type,
        quantity: item.quantity,
        threshold: LOW_ACCESSORY_THRESHOLD,
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
export async function checkAccessoriesForLowStock(items: Array<{ category: string; itemType: string }>) {
  try {
    if (!items || items.length === 0) return;

    const matches = await prisma.customItem.findMany({
      where: {
        isActive: true,
        OR: items.map((i) => ({ name: i.category, type: i.itemType })),
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
