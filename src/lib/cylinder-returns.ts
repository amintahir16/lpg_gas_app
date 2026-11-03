import { prisma } from '@/lib/db';
import { regionScopedWhere } from '@/lib/region';

export type CylinderReturnKind = 'Empty' | 'Buyback';

export interface CylinderReturnItem {
    name: string;
    kind: CylinderReturnKind;
    rawType: string;
    quantity: number;
}

/**
 * Cylinders received back from customers in the period:
 * - B2B empty returns (RETURN_EMPTY transactions and empties returned inside a SALE)
 * - B2B buybacks (cylinders returned with remaining gas for credit)
 * - B2C security returns (customer hands the cylinder back for a security refund)
 * Voided transactions are excluded. Classification matches `splitB2bCylinderItems`.
 */
export async function getCylinderReturnsData({
    startDate,
    endDate,
    regionId,
}: {
    startDate: Date;
    endDate: Date;
    regionId?: string | null;
}): Promise<CylinderReturnItem[]> {
    const txRegionScope = regionId ? { regionId } : {};

    const [b2bItems, b2cReturns, cylinderTypes] = await Promise.all([
        prisma.b2BTransactionItem.findMany({
            where: {
                cylinderType: { not: null },
                transaction: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    ...txRegionScope,
                },
                OR: [
                    { transaction: { transactionType: { in: ['RETURN_EMPTY', 'BUYBACK'] } } },
                    { returnedCondition: { not: null } },
                    { remainingKg: { gt: 0 } },
                    { buybackRate: { not: null } },
                ],
            },
            select: {
                cylinderType: true,
                quantity: true,
                remainingKg: true,
                buybackRate: true,
                transaction: { select: { transactionType: true } },
            },
        }),
        prisma.b2CTransactionSecurityItem.findMany({
            where: {
                isReturn: true,
                transaction: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    ...txRegionScope,
                },
            },
            select: { cylinderType: true, quantity: true },
        }),
        prisma.cylinder.findMany({
            where: regionScopedWhere(regionId),
            distinct: ['cylinderType'],
            select: { cylinderType: true, typeName: true, capacity: true },
        }),
    ]);

    const typeLabels = new Map(
        cylinderTypes.map((ct) => [
            ct.cylinderType,
            ct.typeName ? `${ct.typeName} (${ct.capacity}kg)` : ct.cylinderType,
        ])
    );

    const totals = new Map<string, { cylinderType: string; kind: CylinderReturnKind; qty: number }>();
    const add = (cylinderType: string, kind: CylinderReturnKind, qty: number) => {
        if (!(qty > 0)) return;
        const key = `${kind}|${cylinderType}`;
        const existing = totals.get(key) || { cylinderType, kind, qty: 0 };
        existing.qty += qty;
        totals.set(key, existing);
    };

    b2bItems.forEach((item) => {
        if (!item.cylinderType) return;
        const isBuyback =
            item.transaction.transactionType === 'BUYBACK' ||
            Number(item.remainingKg || 0) > 0 ||
            item.buybackRate !== null;
        add(item.cylinderType, isBuyback ? 'Buyback' : 'Empty', Number(item.quantity));
    });

    b2cReturns.forEach((item) => {
        add(item.cylinderType, 'Empty', item.quantity);
    });

    return Array.from(totals.values())
        .map((t) => ({
            name: typeLabels.get(t.cylinderType) || t.cylinderType,
            kind: t.kind,
            rawType: t.cylinderType,
            quantity: t.qty,
        }))
        .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'Empty' ? -1 : 1));
}
