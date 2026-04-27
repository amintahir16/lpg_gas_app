import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

/**
 * Canonical activity actions performed by system users (admins/super-admins).
 *
 * Convention: <DOMAIN>_<VERB>. Keep this list as the single source of truth so
 * that Team → Activity Log can render rich, consistent timelines.
 */
export const ActivityAction = {
  // B2B Customers
  B2B_CUSTOMER_CREATED: 'B2B_CUSTOMER_CREATED',
  B2B_CUSTOMER_UPDATED: 'B2B_CUSTOMER_UPDATED',
  B2B_CUSTOMER_DELETED: 'B2B_CUSTOMER_DELETED',

  // B2C Customers
  B2C_CUSTOMER_CREATED: 'B2C_CUSTOMER_CREATED',
  B2C_CUSTOMER_UPDATED: 'B2C_CUSTOMER_UPDATED',
  B2C_CUSTOMER_DELETED: 'B2C_CUSTOMER_DELETED',

  // B2B Transactions
  B2B_TRANSACTION_CREATED: 'B2B_TRANSACTION_CREATED',
  B2B_TRANSACTION_VOIDED: 'B2B_TRANSACTION_VOIDED',

  // B2C Transactions
  B2C_TRANSACTION_CREATED: 'B2C_TRANSACTION_CREATED',
  B2C_TRANSACTION_VOIDED: 'B2C_TRANSACTION_VOIDED',

  // Inventory – Cylinders
  CYLINDER_CREATED: 'CYLINDER_CREATED',
  CYLINDER_UPDATED: 'CYLINDER_UPDATED',
  CYLINDER_DELETED: 'CYLINDER_DELETED',

  // Inventory – Custom Accessories
  CUSTOM_ITEM_CREATED: 'CUSTOM_ITEM_CREATED',
  CUSTOM_ITEM_UPDATED: 'CUSTOM_ITEM_UPDATED',
  CUSTOM_ITEM_DELETED: 'CUSTOM_ITEM_DELETED',

  // Financial
  OFFICE_EXPENSE_CREATED: 'OFFICE_EXPENSE_CREATED',
  SALARY_PAID: 'SALARY_PAID',
} as const;

export type ActivityActionKey = keyof typeof ActivityAction;
export type ActivityActionValue = (typeof ActivityAction)[ActivityActionKey];

export type EntityType =
  | 'B2B_CUSTOMER'
  | 'B2C_CUSTOMER'
  | 'B2B_TRANSACTION'
  | 'B2C_TRANSACTION'
  | 'CYLINDER'
  | 'CUSTOM_ITEM'
  | 'OFFICE_EXPENSE'
  | 'SALARY_RECORD';

export interface LogActivityInput {
  userId: string;
  action: ActivityActionValue | (string & {});
  entityType?: EntityType | (string & {}) | null;
  entityId?: string | null;
  details?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  link?: string | null;
  ipAddress?: string | null;
  /** Active branch for this request — pass `getActiveRegionId(request)` from API routes. */
  regionId?: string | null;
}

/**
 * Persist a structured activity log row.
 *
 * Failures are swallowed and logged so that activity tracking never blocks the
 * primary business operation (the user already saw a successful response).
 */
export async function logActivity(input: LogActivityInput) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        details: input.details ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        link: input.link ?? null,
        ipAddress: input.ipAddress ?? null,
        regionId: input.regionId ?? null,
      },
    });
  } catch (error) {
    console.error('[activityLogger] Failed to write activity log:', error);
    return null;
  }
}

/**
 * Format a "key: value" line for the human-readable details column.
 */
export function formatDetailLine(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  return `${label}: ${value}`;
}
