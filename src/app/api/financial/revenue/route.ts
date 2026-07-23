import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { buildPaymentMethodTotals } from '@/lib/payment-methods';
import {
    getFinancialChartBuckets,
    resolveFinancialPeriod,
} from '@/lib/financial-period';
import { isOpeningDuesSaleItem } from '@/lib/b2b-opening-entries';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const regionId = getActiveRegionId(request);
        const txRegionScope = regionId ? { regionId } : {};
        const { searchParams } = new URL(request.url);
        const resolved = resolveFinancialPeriod({
            period: searchParams.get('period'),
            date: searchParams.get('date'),
            month: searchParams.get('month'),
            year: searchParams.get('year'),
        });
        const { startDate, endDate, period, month, year, date, label } = resolved;

        const [b2cGasItems, b2cAccessoryItems, b2bItems, b2bPaidSales, b2bPaymentTxs, b2cPayments] = await Promise.all([
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
            prisma.b2BTransaction.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    transactionType: 'SALE',
                    paidAmount: { gt: 0 },
                    paymentMethod: { not: null },
                    ...txRegionScope,
                },
                select: { paidAmount: true, paymentMethod: true },
            }),
            prisma.b2BTransaction.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    transactionType: 'PAYMENT',
                    ...txRegionScope,
                },
                select: { totalAmount: true, paidAmount: true, paymentMethod: true },
            }),
            prisma.b2CTransaction.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    ...txRegionScope,
                },
                select: { finalAmount: true, totalAmount: true, paymentMethod: true },
            }),
        ]);

        const cylinderTypes = await prisma.cylinder.findMany({
            where: regionScopedWhere(regionId),
            distinct: ['cylinderType'],
            select: { cylinderType: true, typeName: true, capacity: true },
        });
        const typeLabels = new Map(
            cylinderTypes.map((ct) => [ct.cylinderType, ct.typeName ? `${ct.typeName} (${ct.capacity}kg)` : ct.cylinderType])
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

        const cylinders = Array.from(cylinderMap.entries()).map(([type, data]) => ({
            name: typeLabels.get(type) || type,
            type: 'Cylinder',
            rawType: type,
            quantity: data.qty,
            revenue: data.revenue,
        }));
        const accessories = Array.from(accessoryMap.entries()).map(([name, data]) => ({
            name,
            type: 'Accessory',
            rawType: name,
            quantity: data.qty,
            revenue: data.revenue,
        }));

        // Gross collections only — vendor payments / office expenses are netted on Financial page
        const byPaymentMethod = buildPaymentMethodTotals({
            collections: [
                ...b2bPaidSales.map((tx) => ({
                    method: tx.paymentMethod,
                    amount: Number(tx.paidAmount || 0),
                })),
                ...b2bPaymentTxs.map((tx) => ({
                    method: tx.paymentMethod,
                    amount: Number(tx.paidAmount != null ? tx.paidAmount : tx.totalAmount) || 0,
                })),
                ...b2cPayments.map((tx) => ({
                    method: tx.paymentMethod,
                    amount: Number(tx.finalAmount || tx.totalAmount || 0),
                })),
            ],
        });

        const chartBuckets = getFinancialChartBuckets(resolved);
        const chartData = [];
        for (const bucket of chartBuckets) {
            const [b2cGas, b2cAcc, b2bBucketItems] = await Promise.all([
                prisma.b2CTransactionGasItem.aggregate({
                    where: { transaction: { date: { gte: bucket.startDate, lte: bucket.endDate }, voided: false, ...txRegionScope } },
                    _sum: { totalPrice: true },
                }),
                prisma.b2CTransactionAccessoryItem.aggregate({
                    where: { transaction: { date: { gte: bucket.startDate, lte: bucket.endDate }, voided: false, ...txRegionScope } },
                    _sum: { totalPrice: true },
                }),
                prisma.b2BTransactionItem.findMany({
                    where: {
                        transaction: {
                            date: { gte: bucket.startDate, lte: bucket.endDate },
                            voided: false,
                            transactionType: 'SALE',
                            ...txRegionScope,
                        },
                    },
                    select: {
                        cylinderType: true,
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

            let b2bCylinderRevenue = 0;
            let b2bAccessoryRevenue = 0;
            for (const item of b2bBucketItems) {
                if (isOpeningDuesSaleItem(item.transaction, item)) continue;
                const amount = Number(item.totalPrice || 0);
                if (item.cylinderType) b2bCylinderRevenue += amount;
                else b2bAccessoryRevenue += amount;
            }

            chartData.push({
                name: bucket.name,
                cylinders: Number(b2cGas._sum.totalPrice || 0) + b2bCylinderRevenue,
                accessories: Number(b2cAcc._sum.totalPrice || 0) + b2bAccessoryRevenue,
            });
        }

        return NextResponse.json({
            items: [...cylinders, ...accessories],
            chartData,
            byPaymentMethod,
            period,
            date,
            month,
            year,
            label,
        });
    } catch (error) {
        console.error('Revenue API error:', error);
        return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
    }
}
