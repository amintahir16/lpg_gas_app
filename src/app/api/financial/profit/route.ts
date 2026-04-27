import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { subMonths, format } from 'date-fns';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const regionId = getActiveRegionId(request);
        const regionScope = regionScopedWhere(regionId);
        const txRegionScope = regionId ? { regionId } : {};
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
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
                where: { transaction: { date: { gte: startDate, lte: endDate }, voided: false, transactionType: 'SALE', ...txRegionScope } },
                select: {
                    productName: true,
                    cylinderType: true,
                    category: true,
                    quantity: true,
                    pricePerItem: true,
                    totalPrice: true,
                    costPrice: true,
                    transaction: { select: { customerId: true } },
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
            const qty = Number(item.quantity);
            const revenue = Number(item.totalPrice);
            const costPrice = Number(item.costPrice || 0);
            if (item.cylinderType) {
                const key = item.cylinderType;
                const existing = cylinderMap.get(key) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
                existing.qty += qty;
                existing.revenue += revenue;
                // Calculate profit using margin
                const marginCategoryId = custMarginMap.get(item.transaction.customerId);
                const marginPerKg = marginCategoryId ? (marginMap.get(marginCategoryId) || 0) : 0;
                let capacity = 15;
                const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                if (match) {
                    capacity = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
                }
                const profit = qty * capacity * marginPerKg;
                existing.cost += revenue - profit;
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
        const accessories = Array.from(accessoryMap.entries()).map(([name, data]) => ({
            name,
            type: 'Accessory',
            quantity: data.qty,
            revenue: data.revenue,
            cost: data.cost,
            profit: data.profit,
        }));
        // Monthly chart data (last 6 months)
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const chartMonth = subMonths(new Date(year, month - 1, 15), i);
            const chartStart = new Date(chartMonth.getFullYear(), chartMonth.getMonth(), 1);
            const chartEnd = new Date(chartMonth.getFullYear(), chartMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            // B2C profit from gas items
            const b2cGasProfit = await prisma.b2CTransactionGasItem.aggregate({
                where: { transaction: { date: { gte: chartStart, lte: chartEnd }, voided: false, ...txRegionScope } },
                _sum: { profitMargin: true },
            });
            // B2C profit from accessory items
            const b2cAccProfit = await prisma.b2CTransactionAccessoryItem.aggregate({
                where: { transaction: { date: { gte: chartStart, lte: chartEnd }, voided: false, ...txRegionScope } },
                _sum: { profitMargin: true },
            });
            // B2B items — compute actual profit per item
            const b2bChartItems = await prisma.b2BTransactionItem.findMany({
                where: { transaction: { date: { gte: chartStart, lte: chartEnd }, voided: false, transactionType: 'SALE', ...txRegionScope } },
                select: {
                    cylinderType: true,
                    quantity: true,
                    pricePerItem: true,
                    totalPrice: true,
                    costPrice: true,
                    transaction: { select: { customerId: true } },
                },
            });
            let b2bProfit = 0;
            b2bChartItems.forEach((item) => {
                const qty = Number(item.quantity);
                const revenue = Number(item.totalPrice);
                const costPrice = Number(item.costPrice || 0);
                if (item.cylinderType) {
                    const marginCategoryId = custMarginMap.get(item.transaction.customerId);
                    const marginPerKg = marginCategoryId ? (marginMap.get(marginCategoryId) || 0) : 0;
                    let capacity = 15;
                    const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                    if (match) {
                        capacity = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
                    }
                    b2bProfit += qty * capacity * marginPerKg;
                } else {
                    if (costPrice > 0) {
                        b2bProfit += (Number(item.pricePerItem) - costPrice) * qty;
                    } else {
                        b2bProfit += revenue * 0.2;
                    }
                }
            });
            chartData.push({
                name: format(chartStart, 'MMM yyyy'),
                profit: Number(b2cGasProfit._sum.profitMargin || 0) + Number(b2cAccProfit._sum.profitMargin || 0) + b2bProfit,
            });
        }
        return NextResponse.json({
            items: [...cylinders, ...accessories],
            chartData,
            month,
            year,
        });
    } catch (error) {
        console.error('Profit API error:', error);
        return NextResponse.json({ error: 'Failed to fetch profit data' }, { status: 500 });
    }
}