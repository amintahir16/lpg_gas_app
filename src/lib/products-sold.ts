import { prisma } from '@/lib/db';
import { regionScopedWhere } from '@/lib/region';
import { isOpeningDuesSaleItem } from '@/lib/b2b-opening-entries';

export interface ProductsSoldItem {
    name: string;
    type: 'Cylinder' | 'Accessory';
    rawType: string;
    quantity: number;
    revenue: number;
}

export async function getProductsSoldData({
    startDate,
    endDate,
    regionId,
}: {
    startDate: Date;
    endDate: Date;
    regionId?: string | null;
}): Promise<ProductsSoldItem[]> {
    const regionScope = regionScopedWhere(regionId);
    const txRegionScope = regionId ? { regionId } : {};

    const [b2cGasItems, b2cAccessoryItems, b2bItems] = await Promise.all([
        prisma.b2CTransactionGasItem.findMany({
            where: {
                transaction: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    ...txRegionScope,
                },
            },
            select: { cylinderType: true, quantity: true, totalPrice: true },
        }),
        prisma.b2CTransactionAccessoryItem.findMany({
            where: {
                transaction: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    ...txRegionScope,
                },
            },
            select: { productName: true, quantity: true, totalPrice: true },
        }),
        prisma.b2BTransactionItem.findMany({
            where: {
                transaction: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    transactionType: 'SALE',
                    ...txRegionScope,
                },
            },
            select: {
                productName: true,
                cylinderType: true,
                category: true,
                quantity: true,
                pricePerItem: true,
                totalPrice: true,
                transaction: {
                    select: {
                        notes: true,
                        paymentReference: true,
                        totalAmount: true,
                        transactionType: true,
                    },
                },
            },
        }),
    ]);

    const cylinderTypes = await prisma.cylinder.findMany({
        where: regionScopedWhere(regionId),
        distinct: ['cylinderType'],
        select: { cylinderType: true, typeName: true, capacity: true },
    });
    const typeLabels = new Map(
        cylinderTypes.map((ct) => [
            ct.cylinderType,
            ct.typeName ? `${ct.typeName} (${ct.capacity}kg)` : ct.cylinderType,
        ])
    );

    const cylinderMap = new Map<string, { qty: number; revenue: number }>();
    const accessoryMap = new Map<string, { qty: number; revenue: number }>();

    b2cGasItems.forEach((item) => {
        const key = item.cylinderType;
        const existing = cylinderMap.get(key) || { qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += Number(item.totalPrice);
        cylinderMap.set(key, existing);
    });

    b2bItems.forEach((item) => {
        // Opening cylinder dues must not inflate sold qty / revenue
        if (isOpeningDuesSaleItem(item.transaction, item)) return;

        const qty = Number(item.quantity);
        const revenue = Number(item.totalPrice);
        if (item.cylinderType) {
            const key = item.cylinderType;
            const existing = cylinderMap.get(key) || { qty: 0, revenue: 0 };
            existing.qty += qty;
            existing.revenue += revenue;
            cylinderMap.set(key, existing);
        } else {
            const key = item.productName || item.category || 'Unknown Accessory';
            const existing = accessoryMap.get(key) || { qty: 0, revenue: 0 };
            existing.qty += qty;
            existing.revenue += revenue;
            accessoryMap.set(key, existing);
        }
    });

    b2cAccessoryItems.forEach((item) => {
        const key = item.productName;
        const existing = accessoryMap.get(key) || { qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += Number(item.totalPrice);
        accessoryMap.set(key, existing);
    });

    const cylinders: ProductsSoldItem[] = Array.from(cylinderMap.entries()).map(([type, data]) => ({
        name: typeLabels.get(type) || type,
        type: 'Cylinder',
        rawType: type,
        quantity: data.qty,
        revenue: data.revenue,
    }));
    const accessories: ProductsSoldItem[] = Array.from(accessoryMap.entries()).map(([name, data]) => ({
        name,
        type: 'Accessory',
        rawType: name,
        quantity: data.qty,
        revenue: data.revenue,
    }));

    return [...cylinders, ...accessories];
}
