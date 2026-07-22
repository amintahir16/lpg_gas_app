import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import {
    emptyPaymentMethodTotals,
    normalizePaymentMethodKey,
    type PaymentMethodValue,
} from '@/lib/payment-methods';
import {
    getFinancialChartBuckets,
    resolveFinancialPeriod,
} from '@/lib/financial-period';

function adjustPaymentMethodAmount(
    totals: Record<PaymentMethodValue, number>,
    method: string | null | undefined,
    amount: number
) {
    if (!amount) return;
    const key = normalizePaymentMethodKey(method);
    if (!key) return;
    totals[key] += amount;
}

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

        const [b2cGasItems, b2cAccessoryItems, b2bItems, b2bPaidSales, b2bPaymentTxs, b2cPayments, vendorPayments, officeExpenses] = await Promise.all([
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
            prisma.vendorPayment.findMany({
                where: {
                    paymentDate: { gte: startDate, lte: endDate },
                    status: 'COMPLETED',
                    ...txRegionScope,
                },
                select: { amount: true, method: true },
            }),
            // Office rent / daily / vehicle expenses paid via selected method
            prisma.officeExpense.findMany({
                where: {
                    expenseDate: { gte: startDate, lte: endDate },
                    ...txRegionScope,
                },
                select: { amount: true, paymentMethod: true },
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

        const byPaymentMethod = emptyPaymentMethodTotals();
        b2bPaidSales.forEach((tx) => {
            adjustPaymentMethodAmount(byPaymentMethod, tx.paymentMethod, Number(tx.paidAmount || 0));
        });
        b2bPaymentTxs.forEach((tx) => {
            const amount = Number(tx.paidAmount != null ? tx.paidAmount : tx.totalAmount) || 0;
            adjustPaymentMethodAmount(byPaymentMethod, tx.paymentMethod, amount);
        });
        b2cPayments.forEach((tx) => {
            const amount = Number(tx.finalAmount || tx.totalAmount || 0);
            adjustPaymentMethodAmount(byPaymentMethod, tx.paymentMethod, amount);
        });
        vendorPayments.forEach((payment) => {
            adjustPaymentMethodAmount(byPaymentMethod, payment.method, -Number(payment.amount || 0));
        });
        officeExpenses.forEach((expense) => {
            adjustPaymentMethodAmount(byPaymentMethod, expense.paymentMethod, -Number(expense.amount || 0));
        });

        const chartBuckets = getFinancialChartBuckets(resolved);
        const chartData = [];
        for (const bucket of chartBuckets) {
            const [b2cGas, b2cAcc, b2bCylinders, b2bAccessories] = await Promise.all([
                prisma.b2CTransactionGasItem.aggregate({
                    where: { transaction: { date: { gte: bucket.startDate, lte: bucket.endDate }, voided: false, ...txRegionScope } },
                    _sum: { totalPrice: true },
                }),
                prisma.b2CTransactionAccessoryItem.aggregate({
                    where: { transaction: { date: { gte: bucket.startDate, lte: bucket.endDate }, voided: false, ...txRegionScope } },
                    _sum: { totalPrice: true },
                }),
                prisma.b2BTransactionItem.aggregate({
                    where: {
                        transaction: { date: { gte: bucket.startDate, lte: bucket.endDate }, voided: false, transactionType: 'SALE', ...txRegionScope },
                        cylinderType: { not: null },
                    },
                    _sum: { totalPrice: true },
                }),
                prisma.b2BTransactionItem.aggregate({
                    where: {
                        transaction: { date: { gte: bucket.startDate, lte: bucket.endDate }, voided: false, transactionType: 'SALE', ...txRegionScope },
                        cylinderType: null,
                    },
                    _sum: { totalPrice: true },
                }),
            ]);
            chartData.push({
                name: bucket.name,
                cylinders: Number(b2cGas._sum.totalPrice || 0) + Number(b2bCylinders._sum.totalPrice || 0),
                accessories: Number(b2cAcc._sum.totalPrice || 0) + Number(b2bAccessories._sum.totalPrice || 0),
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
