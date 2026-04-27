import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfMonth, subMonths, format } from 'date-fns';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const regionId = getActiveRegionId(request);
        const txRegionScope = regionId ? { regionId } : {};
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // Fetch all transaction items for the month
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
                },
            }),
        ]);
        // Get dynamic cylinder types for display labels
        const cylinderTypes = await prisma.cylinder.findMany({
            where: regionScopedWhere(regionId),
            distinct: ['cylinderType'],
            select: { cylinderType: true, typeName: true, capacity: true },
        });
        const typeLabels = new Map(
            cylinderTypes.map((ct) => [ct.cylinderType, ct.typeName ? `${ct.typeName} (${ct.capacity}kg)` : ct.cylinderType])
        );
        // Aggregate by product
        const cylinderMap = new Map<string, { qty: number; revenue: number }>();
        const accessoryMap = new Map<string, { qty: number; revenue: number }>();
        // B2C gas items
        b2cGasItems.forEach((item) => {
            const key = item.cylinderType;
            const existing = cylinderMap.get(key) || { qty: 0, revenue: 0 };
            existing.qty += item.quantity;
            existing.revenue += Number(item.totalPrice);
            cylinderMap.set(key, existing);
        });
        // B2B items — cylinders vs accessories
        b2bItems.forEach((item) => {
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
        // B2C accessory items
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
        // Monthly chart data (last 6 months)
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const chartMonth = subMonths(new Date(year, month - 1, 15), i);
            const chartStart = new Date(chartMonth.getFullYear(), chartMonth.getMonth(), 1);
            const chartEnd = new Date(chartMonth.getFullYear(), chartMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            const [b2cGas, b2cAcc, b2bCylinders, b2bAccessories] = await Promise.all([
                prisma.b2CTransactionGasItem.aggregate({
                    where: { transaction: { date: { gte: chartStart, lte: chartEnd }, voided: false, ...txRegionScope } },
                    _sum: { totalPrice: true },
                }),
                prisma.b2CTransactionAccessoryItem.aggregate({
                    where: { transaction: { date: { gte: chartStart, lte: chartEnd }, voided: false, ...txRegionScope } },
                    _sum: { totalPrice: true },
                }),
                // B2B cylinder items (have cylinderType set)
                prisma.b2BTransactionItem.aggregate({
                    where: {
                        transaction: { date: { gte: chartStart, lte: chartEnd }, voided: false, transactionType: 'SALE', ...txRegionScope },
                        cylinderType: { not: null },
                    },
                    _sum: { totalPrice: true },
                }),
                // B2B accessory items (no cylinderType)
                prisma.b2BTransactionItem.aggregate({
                    where: {
                        transaction: { date: { gte: chartStart, lte: chartEnd }, voided: false, transactionType: 'SALE', ...txRegionScope },
                        cylinderType: null,
                    },
                    _sum: { totalPrice: true },
                }),
            ]);
            chartData.push({
                name: format(chartStart, 'MMM yyyy'),
                cylinders: Number(b2cGas._sum.totalPrice || 0) + Number(b2bCylinders._sum.totalPrice || 0),
                accessories: Number(b2cAcc._sum.totalPrice || 0) + Number(b2bAccessories._sum.totalPrice || 0),
            });
        }
        return NextResponse.json({
            items: [...cylinders, ...accessories],
            chartData,
            month,
            year,
        });
    } catch (error) {
        console.error('Revenue API error:', error);
        return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
    }
}
