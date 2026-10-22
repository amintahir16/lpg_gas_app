/**
 * Shared helpers for dashboard "Sales Activities" list + PDF report.
 * Security deposits are liabilities — never treated as sales/payments here.
 */

import type { Prisma } from '@prisma/client';
import { parseCylinderVariantKey } from '@/lib/cylinder-variant-key';
import { getCapacityFromTypeString, getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

export type DashboardSalesActivityRow = {
  id: string;
  transactionId: string;
  channel: 'b2b' | 'b2c';
  transactionType: string;
  type: string;
  title: string;
  description: string;
  /** Record creation time — used for ordering and payment allocation. */
  time: string;
  /** Operator-entered transaction time (same value the customer ledger shows). */
  transactionTime?: string;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentStatus: string;
  customerId: string;
  customerName: string;
  billSno: string | null;
  recordedBy: string | null;
  status: 'success' | 'warning' | 'error';
};

/** Prisma Decimal / number / string — accepted by Number(...) in helpers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MoneyLike = any;

type CylinderLine = {
  quantity?: MoneyLike;
  cylinderType?: string | null;
  cylinderVariantKey?: string | null;
  productName?: string | null;
  remainingKg?: MoneyLike;
};

type SecurityLine = {
  quantity?: MoneyLike;
  totalPrice?: MoneyLike;
  isReturn?: boolean | null;
  cylinderType?: string | null;
  cylinderVariantKey?: string | null;
};

/** Prisma where fragment: B2C rows that are real sales (not pure security). */
export const b2cSalesActivityWhere: Prisma.B2CTransactionWhereInput = {
  OR: [
    { gasItems: { some: {} } },
    { accessoryItems: { some: {} } },
    { deliveryCharges: { gt: 0 } },
  ],
};

export function b2cSecurityDepositTotal(
  securityItems: SecurityLine[] | null | undefined
): number {
  if (!securityItems?.length) return 0;
  return securityItems.reduce((sum, item) => {
    if (item.isReturn) return sum;
    return sum + Number(item.totalPrice || 0);
  }, 0);
}

/** All security line amounts (deposits + return refunds) — matches dashboard revenue. */
export function b2cAllSecurityLinesTotal(
  securityItems: SecurityLine[] | null | undefined
): number {
  if (!securityItems?.length) return 0;
  return securityItems.reduce(
    (sum, item) => sum + Number(item.totalPrice || 0),
    0
  );
}

/**
 * B2C sales revenue — same formula as dashboard Period Revenue (sales portion):
 * totalAmount − all security lines + deliveryCharges
 * (security deposits/refunds are liabilities, not sales).
 */
export function b2cSalesAmount(input: {
  finalAmount?: MoneyLike;
  totalAmount?: MoneyLike;
  deliveryCharges?: MoneyLike;
  securityItems?: SecurityLine[] | null;
}): number {
  const securityLines = b2cAllSecurityLinesTotal(input.securityItems);
  return Math.max(
    0,
    Number(input.totalAmount || 0) -
      securityLines +
      Number(input.deliveryCharges || 0)
  );
}

/** B2B sale revenue from line items — same as dashboard (pricePerItem × qty). */
export function b2bSaleRevenueFromItems(
  items: Array<{ quantity?: MoneyLike; pricePerItem?: MoneyLike }> | null | undefined
): number {
  if (!items?.length) return 0;
  return items.reduce(
    (sum, item) =>
      sum + Number(item.pricePerItem || 0) * Number(item.quantity || 0),
    0
  );
}

function cylinderLineLabel(item: CylinderLine): string {
  const vk = item.cylinderVariantKey?.trim();
  if (vk?.includes('|||')) {
    const p = parseCylinderVariantKey(vk);
    if (p?.cylinderType) {
      const cap = p.capacity ?? getCapacityFromTypeString(p.cylinderType);
      if (p.normalizedTypeNameLower && p.normalizedTypeNameLower !== 'null') {
        const tn = p.normalizedTypeNameLower.replace(/\b\w/g, (c) => c.toUpperCase());
        return `${tn} ${cap}kg`;
      }
      return `${getCylinderTypeDisplayName(p.cylinderType)} ${cap}kg`;
    }
  }
  if (item.cylinderType) {
    return getCylinderTypeDisplayName(item.cylinderType);
  }
  return item.productName?.trim() || 'cylinder';
}

export function groupCylinderLines(items: CylinderLine[]): string {
  if (!items.length) return '';
  const grouped = new Map<string, number>();
  for (const it of items) {
    const name = cylinderLineLabel(it);
    grouped.set(name, (grouped.get(name) || 0) + Number(it.quantity || 0));
  }
  return Array.from(grouped.entries())
    .map(([name, qty]) => `${qty} ${name}`)
    .join(', ');
}

type B2bActivityItem = CylinderLine & {
  returnedCondition?: string | null;
  buybackRate?: MoneyLike;
};

/**
 * Split B2B cylinder lines the same way the customer ledger does: a unified
 * SALE can also carry empty returns (returnedCondition set) and buybacks
 * (remainingKg / buybackRate set) — those are not sold cylinders.
 */
export function splitB2bCylinderItems<T extends B2bActivityItem>(items: T[]): {
  sold: T[];
  returned: T[];
  boughtBack: T[];
} {
  const sold: T[] = [];
  const returned: T[] = [];
  const boughtBack: T[] = [];
  for (const item of items) {
    if (!item.cylinderType) continue;
    const isBuyback =
      Number(item.remainingKg || 0) > 0 ||
      (item.buybackRate !== null && item.buybackRate !== undefined);
    if (isBuyback) boughtBack.push(item);
    else if (item.returnedCondition) returned.push(item);
    else sold.push(item);
  }
  return { sold, returned, boughtBack };
}

/** Details text for a B2B SALE row (sold / returned / bought back). */
export function describeB2bSaleActivity<T extends B2bActivityItem>(
  items: T[],
  customer: string,
  groupCylinders: (lines: T[]) => string = groupCylinderLines
): string {
  const { sold, returned, boughtBack } = splitB2bCylinderItems(items);
  const accessoryItems = items.filter((i) => !i.cylinderType);
  const accCount = accessoryItems.reduce((s, i) => s + Number(i.quantity || 0), 0);

  const soldParts: string[] = [];
  const cylSummary = groupCylinders(sold);
  if (cylSummary) soldParts.push(cylSummary);
  if (accCount > 0) {
    const accNames = Array.from(
      new Set(accessoryItems.map((a) => a.productName?.trim()).filter(Boolean))
    );
    const accLabel =
      accNames.length === 1 ? accNames[0]! : `accessor${accCount > 1 ? 'ies' : 'y'}`;
    soldParts.push(`${accCount} ${accLabel}`);
  }
  const soldSummary = soldParts.join(' + ');

  const extras: string[] = [];
  const returnSummary = groupCylinders(returned);
  if (returnSummary) extras.push(`${returnSummary} returned`);
  const buybackSummary = groupCylinders(boughtBack);
  if (buybackSummary) extras.push(`${buybackSummary} bought back`);

  if (soldSummary) {
    return [`${soldSummary} sold to ${customer}`, ...extras].join(' • ');
  }
  if (extras.length) {
    return `${extras.join(' • ')} by ${customer}`;
  }
  return `Sale to ${customer}`;
}

export function userDisplayName(user: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined): string | null {
  if (!user) return null;
  return (
    user.name?.trim() ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.email?.trim() ||
    null
  );
}

export function buildB2bActivityRow(t: {
  id: string;
  billSno: string | null;
  createdAt: Date;
  time?: Date | null;
  createdBy?: string | null;
  voided?: boolean | null;
  transactionType: string;
  totalAmount: MoneyLike;
  paidAmount?: MoneyLike;
  unpaidAmount?: MoneyLike;
  paymentStatus?: string | null;
  customerId: string;
  customer?: { id: string; name: string } | null;
  items?: Array<B2bActivityItem & { pricePerItem?: MoneyLike }>;
  users?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}): DashboardSalesActivityRow {
  const customer = t.customer?.name || 'Unknown';
  const items = t.items || [];

  let title = 'B2B Transaction';
  let description = customer;

  if (t.transactionType === 'PAYMENT') {
    title = 'B2B Payment';
    description = `Direct payment from ${customer} (applied to open sales)`;
  } else if (t.transactionType === 'SALE') {
    title = 'B2B Sale';
    description = describeB2bSaleActivity(items, customer);
  }

  const isPayment = t.transactionType === 'PAYMENT';
  // Sales: line-item revenue (matches dashboard). Payments: cash received amount.
  const totalAmount = isPayment
    ? Number(t.totalAmount || 0)
    : b2bSaleRevenueFromItems(items) || Number(t.totalAmount || 0);
  const paidAmount = isPayment
    ? totalAmount
    : Number(t.paidAmount != null ? t.paidAmount : 0);
  const unpaidAmount = isPayment
    ? 0
    : Number(
        t.unpaidAmount != null
          ? t.unpaidAmount
          : Math.max(0, totalAmount - paidAmount)
      );
  const paymentStatus = isPayment
    ? 'RECEIVED'
    : t.paymentStatus ||
      (unpaidAmount <= 0 && totalAmount > 0
        ? 'FULLY_PAID'
        : paidAmount > 0
          ? 'PARTIAL'
          : 'UNPAID');

  return {
    id: `b2b-${t.id}`,
    transactionId: t.id,
    channel: 'b2b',
    transactionType: t.transactionType,
    type: isPayment ? 'b2b_payment' : 'b2b_sale',
    title,
    description,
    time: t.createdAt.toISOString(),
    transactionTime: t.time?.toISOString(),
    amount: totalAmount,
    totalAmount,
    paidAmount,
    unpaidAmount,
    paymentStatus,
    customerId: t.customerId,
    customerName: customer,
    billSno: t.billSno,
    recordedBy: userDisplayName(t.users),
    status: t.voided ? 'error' : 'success',
  };
}

/** B2C security retention (25% kept on return) — revenue, not a deposit hold. */
export function buildB2cRetentionActivityRow(h: {
  id: string;
  customerId: string;
  returnDate?: Date | null;
  returnDeduction?: MoneyLike;
  quantity?: MoneyLike;
  cylinderType?: string | null;
  cylinderVariantKey?: string | null;
  customer?: { id: string; name: string } | null;
}): DashboardSalesActivityRow {
  const customer = h.customer?.name || 'Unknown';
  const amount = Math.max(0, Number(h.returnDeduction || 0));
  const qty = Number(h.quantity || 0);
  const cyl = groupCylinderLines([
    {
      quantity: qty || 1,
      cylinderType: h.cylinderType,
      cylinderVariantKey: h.cylinderVariantKey,
    },
  ]);
  const when = h.returnDate || new Date();

  return {
    id: `b2c-retention-${h.id}`,
    transactionId: h.id,
    channel: 'b2c',
    transactionType: 'SECURITY_RETENTION',
    type: 'b2c_retention',
    title: 'B2C Security Retention',
    description: cyl
      ? `${cyl} security retained (25%) from ${customer}`
      : `Security retained (25%) from ${customer}`,
    time: when.toISOString(),
    amount,
    totalAmount: amount,
    paidAmount: amount,
    unpaidAmount: 0,
    paymentStatus: 'FULLY_PAID',
    customerId: h.customerId,
    customerName: customer,
    billSno: null,
    recordedBy: null,
    status: 'success',
  };
}

export function buildB2cActivityRow(
  t: {
    id: string;
    billSno: string | null;
    createdAt: Date;
    time?: Date | null;
    createdBy?: string | null;
    voided?: boolean | null;
    finalAmount?: MoneyLike;
    totalAmount?: MoneyLike;
    deliveryCharges?: MoneyLike;
    customerId: string;
    customer?: { id: string; name: string } | null;
    gasItems?: CylinderLine[];
    accessoryItems?: Array<{ quantity?: MoneyLike; productName?: string | null }>;
    securityItems?: SecurityLine[];
  },
  recordedByName?: string | null
): DashboardSalesActivityRow {
  const customer = t.customer?.name || 'Unknown';
  const gasItems = t.gasItems || [];
  const accessoryItems = t.accessoryItems || [];
  const gasQty = gasItems.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const accQty = accessoryItems.reduce((s, i) => s + Number(i.quantity || 0), 0);

  const parts: string[] = [];
  if (gasQty > 0) {
    const grouped = groupCylinderLines(gasItems);
    parts.push(grouped ? `${grouped} gas sold` : `${gasQty} gas sold`);
  }
  if (accQty > 0) {
    const accNames = Array.from(
      new Set(accessoryItems.map((a) => a.productName?.trim()).filter(Boolean))
    );
    const accLabel =
      accNames.length === 1 ? accNames[0]! : `accessor${accQty > 1 ? 'ies' : 'y'}`;
    parts.push(`${accQty} ${accLabel}`);
  }

  let title = 'B2C Sale';
  if (gasQty > 0) title = 'B2C Gas Sale';
  else if (accQty > 0) title = 'B2C Accessory Sale';
  else title = 'B2C Sale';

  const description = parts.length
    ? `${parts.join(' • ')} for ${customer}`
    : `Sale to ${customer}`;

  const totalAmount = b2cSalesAmount(t);

  return {
    id: `b2c-${t.id}`,
    transactionId: t.id,
    channel: 'b2c',
    transactionType: 'SALE',
    type: 'b2c_sale',
    title,
    description,
    time: t.createdAt.toISOString(),
    transactionTime: t.time?.toISOString(),
    amount: totalAmount,
    totalAmount,
    paidAmount: totalAmount,
    unpaidAmount: 0,
    paymentStatus: 'FULLY_PAID',
    customerId: t.customerId,
    customerName: customer,
    billSno: t.billSno,
    recordedBy: recordedByName || null,
    status: t.voided ? 'error' : 'success',
  };
}

/** Revenue rows that should drive Sales Total / Paid / Unpaid (excludes payment rows). */
export function isRevenueSalesActivity(a: {
  type?: string | null;
  title?: string | null;
}): boolean {
  if (a.type === 'b2b_sale' || a.type === 'b2c_sale' || a.type === 'b2c_retention') {
    return true;
  }
  const title = a.title || '';
  return title === 'B2B Sale' || title.startsWith('B2C');
}

/**
 * Display-only: apply B2B direct PAYMENT rows onto open B2B SALE unpaid balances
 * in chronological order per customer (does not change DB / transaction flow).
 *
 * Why: payments reduce ledger balance but leave the original sale's paid/unpaid
 * snapshot unchanged — which makes Recent Sales Activity look "still unpaid".
 */
export function allocateB2bPaymentsOntoSales(
  activities: DashboardSalesActivityRow[]
): DashboardSalesActivityRow[] {
  const rows = activities.map((a) => ({ ...a }));

  // Pool all direct B2B payments and overpayment excesses from B2B sales
  const creditByCustomer = new Map<string, number>();
  for (const row of rows) {
    if (row.channel !== 'b2b' || !row.customerId) {
      continue;
    }
    if (row.type === 'b2b_payment') {
      const credit = Math.max(0, Number(row.totalAmount) || 0);
      creditByCustomer.set(
        row.customerId,
        (creditByCustomer.get(row.customerId) || 0) + credit
      );
    } else if (row.type === 'b2b_sale') {
      const total = Math.max(0, Number(row.totalAmount) || 0);
      const rawPaid = Math.max(0, Number(row.paidAmount) || 0);
      if (rawPaid > total) {
        const excess = rawPaid - total;
        creditByCustomer.set(
          row.customerId,
          (creditByCustomer.get(row.customerId) || 0) + excess
        );
      }
    }
  }

  // Apply credits to open B2B sales oldest-first (FIFO) within this activity set.
  const saleIndices = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.channel === 'b2b' && row.type === 'b2b_sale' && row.customerId)
    .sort(
      (a, b) =>
        new Date(a.row.time).getTime() - new Date(b.row.time).getTime()
    );

  for (const { row, index } of saleIndices) {
    const customerId = row.customerId!;
    const total = Math.max(0, Number(row.totalAmount) || 0);
    const rawPaid = Math.max(0, Number(row.paidAmount) || 0);

    if (rawPaid > total) {
      // Sale itself was overpaid: show exact paid amount, 0 unpaid, fully paid
      rows[index] = {
        ...row,
        amount: total,
        paidAmount: rawPaid,
        unpaidAmount: 0,
        paymentStatus: 'FULLY_PAID',
      };
    } else {
      let unpaid = Math.max(0, total - rawPaid);
      let paid = rawPaid;

      if (unpaid > 0) {
        const credit = creditByCustomer.get(customerId) || 0;
        const applied = Math.min(unpaid, credit);

        if (applied > 0) {
          creditByCustomer.set(customerId, credit - applied);
          unpaid -= applied;
          paid += applied;
        }
      }

      rows[index] = {
        ...row,
        amount: total,
        paidAmount: paid,
        unpaidAmount: unpaid,
        paymentStatus:
          unpaid <= 0.0001
            ? 'FULLY_PAID'
            : paid > 0.0001
              ? 'PARTIAL'
              : 'UNPAID',
      };
    }
  }

  return rows;
}
