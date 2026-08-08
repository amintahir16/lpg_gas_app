import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import {
    getFinancialChartBuckets,
    getFinancialChartRange,
    findChartBucketIndex,
    resolveFinancialPeriod,
} from '@/lib/financial-period';
import { isOpeningDuesSaleItem } from '@/lib/b2b-opening-entries';
import { calculateGasLineProfit } from '@/lib/gas-profit';
import { getCapacityFromTypeString } from '@/lib/cylinder-utils';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const regionId = getActiveRegionId(request);
        const regionScope = regionScopedWhere(regionId);
        const txRegionScope = regionId ? { regionId } : {};
        const { searchParams } = new URL(request.url);
        const resolved = resolveFinancialPeriod({
            period: searchParams.get('period'),
            date: searchParams.get('date'),
            month: searchParams.get('month'),
            year: searchParams.get('year'),
        });
        const { startDate, endDate, period, month, year, date, label } = resolved;

        const cylinderTypes = await prisma.cylinder.findMany({
            where: regionScope,
            distinct: ['cylinderType'],
            select: { cylinderType: true, typeName: true, capacity: true },
        });
        const typeLabels = new Map(
            cylinderTypes.map((ct) => [ct.cylinderType, ct.typeName ? `${ct.typeName} (${ct.capacity}kg)` : ct.cylinderType])
        );
        // Fetch transaction items
        const [b2cGasItems, b2cAccessoryItems, b2bItems] = await Promise.all([
            prisma.b2CTransactionGasItem.findMany({
                where: { transaction: { date: { gte: startDate, lte: endDate }, voided: false, ...txRegionScope } },
                select: { cylinderType: true, quantity: true, totalPrice: true, totalCost: true, profitMargin: true },
            }),
            prisma.b2CTransactionAccessoryItem.findMany({
                where: { transaction: { date: { gte: startDate, lte: endDate }, voided: false, ...txRegionScope } },
                select: { productName: true, quantity: true, totalPrice: true, totalCost: true, profitMargin: true },
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
                    costPrice: true,
                    transaction: {
                        select: {
                            customerId: true,
                            notes: true,
                            paymentReference: true,
                            totalAmount: true,
                            transactionType: true,
                        },
                    },
                },
            }),
        ]);
        // Get B2B margins
        const b2bCustomerIds = [...new Set(b2bItems.map((i) => i.transaction.customerId))];
        const customersWithMargin = await prisma.customer.findMany({
            where: { id: { in: b2bCustomerIds }, ...regionScope },
            select: { id: true, marginCategoryId: true },
        });
        const marginCategoryIds = [...new Set(customersWithMargin.map((c) => c.marginCategoryId).filter(Boolean))] as string[];
        const marginCategories = await prisma.marginCategory.findMany({
            where: { id: { in: marginCategoryIds } },
        });
        const marginMap = new Map(marginCategories.map((mc) => [mc.id, Number(mc.marginPerKg)]));
        const custMarginMap = new Map(customersWithMargin.map((c) => [c.id, c.marginCategoryId]));
        // Aggregate
        const cylinderMap = new Map<string, { qty: number; revenue: number; cost: number; profit: number }>();
        const accessoryMap = new Map<string, { qty: number; revenue: number; cost: number; profit: number }>();
        // B2C gas items
        b2cGasItems.forEach((item) => {
            const key = item.cylinderType;
            const existing = cylinderMap.get(key) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
            existing.qty += item.quantity;
            existing.revenue += Number(item.totalPrice);
            existing.cost += Number(item.totalCost || 0);
            existing.profit += Number(item.profitMargin || 0);
            cylinderMap.set(key, existing);
        });
        // B2C accessory items
        b2cAccessoryItems.forEach((item) => {
            const key = item.productName;
            const existing = accessoryMap.get(key) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
            existing.qty += item.quantity;
            existing.revenue += Number(item.totalPrice);
            existing.cost += Number(item.totalCost || 0);
            existing.profit += Number(item.profitMargin || 0);
            accessoryMap.set(key, existing);
        });
        // B2B items
        b2bItems.forEach((item) => {
            if (isOpeningDuesSaleItem(item.transaction, item)) return;
            const qty = Number(item.quantity);
            const revenue = Number(item.totalPrice);
            const costPrice = Number(item.costPrice || 0);
            if (item.cylinderType) {
                const key = item.cylinderType;
                const existing = cylinderMap.get(key) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
                existing.qty += qty;
                existing.revenue += revenue;
                const marginCategoryId = custMarginMap.get(item.transaction.customerId);
                const marginPerKg = marginCategoryId ? (marginMap.get(marginCategoryId) || 0) : 0;
                let capacity = getCapacityFromTypeString(item.cylinderType) || 15;
                const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                if (!(capacity > 0) && match) {
                    capacity = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
                }
                const profit = calculateGasLineProfit({
                    pricePerItem: Number(item.pricePerItem),
                    quantity: qty,
                    costPrice,
                    capacityKg: capacity,
                    marginPerKg,
                });
                existing.cost += costPrice > 0 ? costPrice * qty : Math.max(0, revenue - profit);
                existing.profit += profit;
                cylinderMap.set(key, existing);
            } else {
                const key = item.productName || item.category || 'Unknown Accessory';
                const existing = accessoryMap.get(key) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
                existing.qty += qty;
                existing.revenue += revenue;
                if (costPrice > 0) {
                    const profit = (Number(item.pricePerItem) - costPrice) * qty;
                    existing.cost += costPrice * qty;
                    existing.profit += profit;
                } else {
                    existing.cost += revenue * 0.8;
                    existing.profit += revenue * 0.2;
                }
                accessoryMap.set(key, existing);
            }
        });
        const cylinders = Array.from(cylinderMap.entries()).map(([type, data]) => ({
            name: typeLabels.get(type) || type,
            type: 'Cylinder',
            quantity: data.qty,
            revenue: data.revenue,
            cost: data.cost,
            profit: data.profit,
        }));

        const retentionGroups = await prisma.b2CCylinderHolding.groupBy({
            by: ['cylinderType', 'cylinderVariantKey'],
            where: {
                isReturned: true,
                returnDate: { gte: startDate, lte: endDate },
                returnDeduction: { gt: 0 },
                customer: regionScope,
            },
            _sum: {
                returnDeduction: true,
                quantity: true,
            },
        });

        for (const g of retentionGroups) {
            const retentionAmount = Number(g._sum.returnDeduction || 0);
            if (retentionAmount <= 0) continue;

            const typeLabel = typeLabels.get(g.cylinderType) || g.cylinderType;
            cylinders.push({
                name: `${typeLabel} — security return (25% retained)`,
                type: 'Cylinder',
                quantity: Number(g._sum.quantity || 0),
                revenue: 0,
                cost: 0,
                profit: retentionAmount,
            });
        }

        const accessories = Array.from(accessoryMap.entries()).map(([name, data]) => ({
            name,
            type: 'Accessory',
            quantity: data.qty,
            revenue: data.revenue,
            cost: data.cost,
            profit: data.profit,
        }));

        // One chart-range fetch + in-memory buckets (same profit rules as per-bucket loop)
        const chartBuckets = getFinancialChartBuckets(resolved);
        const chartRange = getFinancialChartRange(chartBuckets);
        const [chartB2cGas, chartB2cAcc, chartB2bItems, chartRetentions] = await Promise.all([
            prisma.b2CTransactionGasItem.findMany({
                where: {
                    transaction: {
                        date: { gte: chartRange.startDate, lte: chartRange.endDate },
                        voided: false,
                        ...txRegionScope,
                    },
                },
                select: {
                    profitMargin: true,
                    transaction: { select: { date: true } },
                },
            }),
            prisma.b2CTransactionAccessoryItem.findMany({
                where: {
                    transaction: {
                        date: { gte: chartRange.startDate, lte: chartRange.endDate },
                        voided: false,
                        ...txRegionScope,
                    },
                },
                select: {
                    profitMargin: true,
                    transaction: { select: { date: true } },
                },
            }),
            prisma.b2BTransactionItem.findMany({
                where: {
                    transaction: {
                        date: { gte: chartRange.startDate, lte: chartRange.endDate },
                        voided: false,
                        transactionType: 'SALE',
                        ...txRegionScope,
                    },
                },
                select: {
                    cylinderType: true,
                    quantity: true,
                    pricePerItem: true,
                    totalPrice: true,
                    costPrice: true,
                    transaction: {
                        select: {
                            date: true,
                            customerId: true,
                            notes: true,
                            paymentReference: true,
                            totalAmount: true,
                            transactionType: true,
                        },
                    },
                },
            }),
            prisma.b2CCylinderHolding.findMany({
                where: {
                    isReturned: true,
                    returnDate: { gte: chartRange.startDate, lte: chartRange.endDate },
                    returnDeduction: { gt: 0 },
                    customer: regionScope,
                },
                select: { returnDeduction: true, returnDate: true },
            }),
        ]);

        // Same margin maps as before (built from period customers only).
        const chartData = chartBuckets.map((bucket) => ({
            name: bucket.name,
            profit: 0,
        }));

        for (const item of chartB2cGas) {
            const idx = findChartBucketIndex(chartBuckets, item.transaction.date);
            if (idx >= 0) chartData[idx].profit += Number(item.profitMargin || 0);
        }
        for (const item of chartB2cAcc) {
            const idx = findChartBucketIndex(chartBuckets, item.transaction.date);
            if (idx >= 0) chartData[idx].profit += Number(item.profitMargin || 0);
        }
        for (const item of chartB2bItems) {
            if (isOpeningDuesSaleItem(item.transaction, item)) continue;
            const idx = findChartBucketIndex(chartBuckets, item.transaction.date);
            if (idx < 0) continue;
            const qty = Number(item.quantity);
            const revenue = Number(item.totalPrice);
            const costPrice = Number(item.costPrice || 0);
            if (item.cylinderType) {
                const marginCategoryId = custMarginMap.get(item.transaction.customerId);
                const marginPerKg = marginCategoryId ? (marginMap.get(marginCategoryId) || 0) : 0;
                let capacity = getCapacityFromTypeString(item.cylinderType) || 15;
                const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                if (!(capacity > 0) && match) {
                    capacity = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
                }
                chartData[idx].profit += calculateGasLineProfit({
                    pricePerItem: Number(item.pricePerItem),
                    quantity: qty,
                    costPrice,
                    capacityKg: capacity,
                    marginPerKg,
                });
            } else if (costPrice > 0) {
                chartData[idx].profit += (Number(item.pricePerItem) - costPrice) * qty;
            } else {
                chartData[idx].profit += revenue * 0.2;
            }
        }
        for (const holding of chartRetentions) {
            const idx = findChartBucketIndex(chartBuckets, holding.returnDate);
            if (idx >= 0) chartData[idx].profit += Number(holding.returnDeduction || 0);
        }
        return NextResponse.json({
            items: [...cylinders, ...accessories],
            chartData,
            period,
            date,
            month,
            year,
            label,
        });
    } catch (error) {
        console.error('Profit API error:', error);
        return NextResponse.json({ error: 'Failed to fetch profit data' }, { status: 500 });
    }
}
