import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import { buildPaymentMethodTotals } from '@/lib/payment-methods';
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

        // 1. Revenue + B2B items (single fetch used for revenue AND gross profit)
        const [b2cGasRev, b2cAccRev, b2cDeliveryRev, b2bItems, b2cSecurityRetentionSum, b2cProfit] =
            await Promise.all([
                prisma.b2CTransactionGasItem.aggregate({
                    where: {
                        transaction: {
                            date: { gte: startDate, lte: endDate },
                            voided: false,
                            ...txRegionScope,
                        },
                    },
                    _sum: { totalPrice: true },
                }),
                prisma.b2CTransactionAccessoryItem.aggregate({
                    where: {
                        transaction: {
                            date: { gte: startDate, lte: endDate },
                            voided: false,
                            ...txRegionScope,
                        },
                    },
                    _sum: { totalPrice: true },
                }),
                prisma.b2CTransaction.aggregate({
                    where: {
                        date: { gte: startDate, lte: endDate },
                        voided: false,
                        ...txRegionScope,
                    },
                    _sum: { deliveryCharges: true },
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
                        totalPrice: true,
                        pricePerItem: true,
                        cylinderType: true,
                        quantity: true,
                        costPrice: true,
                        transaction: {
                            select: {
                                notes: true,
                                paymentReference: true,
                                totalAmount: true,
                                transactionType: true,
                                customer: { select: { marginCategory: true } },
                            },
                        },
                    },
                }),
                prisma.b2CCylinderHolding.aggregate({
                    where: {
                        isReturned: true,
                        returnDate: { gte: startDate, lte: endDate },
                        returnDeduction: { gt: 0 },
                        customer: regionScope,
                    },
                    _sum: { returnDeduction: true },
                }),
                prisma.b2CTransaction.aggregate({
                    where: {
                        date: { gte: startDate, lte: endDate },
                        voided: false,
                        ...txRegionScope,
                    },
                    _sum: { actualProfit: true },
                }),
            ]);

        const b2cSalesRevenue =
            Number(b2cGasRev._sum.totalPrice || 0) +
            Number(b2cAccRev._sum.totalPrice || 0) +
            Number(b2cDeliveryRev._sum.deliveryCharges || 0);

        const b2bSalesRevenue = b2bItems.reduce((sum, item) => {
            if (isOpeningDuesSaleItem(item.transaction, item)) return sum;
            return sum + Number(item.totalPrice || 0);
        }, 0);

        const b2cSecurityRetention = Number(b2cSecurityRetentionSum._sum.returnDeduction || 0);
        const totalRevenue = b2cSalesRevenue + b2bSalesRevenue + b2cSecurityRetention;

        // 2. Expenses (office + personal)
        const [officeExpensesSum, personalExpensesSum] = await Promise.all([
            prisma.officeExpense.aggregate({
                where: {
                    expenseDate: { gte: startDate, lte: endDate },
                    ...regionScope,
                },
                _sum: { amount: true },
            }),
            prisma.personalExpense.aggregate({
                where: {
                    expenseDate: { gte: startDate, lte: endDate },
                    ...regionScope,
                },
                _sum: { amount: true },
            }),
        ]);

        const totalExpenses =
            Number(officeExpensesSum._sum.amount || 0) +
            Number(personalExpensesSum._sum.amount || 0);

        // 3. Profit (Gross Profit) — reuse b2bItems from step 1
        let b2bGrossProfit = 0;
        b2bItems.forEach((item) => {
            if (isOpeningDuesSaleItem(item.transaction, item)) return;
            if (item.cylinderType) {
                const marginPerKg = Number(
                    item.transaction.customer?.marginCategory?.marginPerKg || 0
                );
                let capacity = getCapacityFromTypeString(item.cylinderType) || 15;
                const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                if (!(capacity > 0) && match) {
                    capacity = match[2]
                        ? parseFloat(`${match[1]}.${match[2]}`)
                        : parseFloat(match[1]);
                }
                b2bGrossProfit += calculateGasLineProfit({
                    pricePerItem: Number(item.pricePerItem),
                    quantity: Number(item.quantity),
                    costPrice: Number(item.costPrice || 0),
                    capacityKg: capacity,
                    marginPerKg,
                });
            } else {
                const costPrice = Number(item.costPrice || 0);
                if (costPrice > 0) {
                    b2bGrossProfit +=
                        Number(item.totalPrice) - costPrice * Number(item.quantity);
                } else {
                    b2bGrossProfit += Number(item.totalPrice) * 0.2;
                }
            }
        });

        const totalProfit = Number(b2cProfit._sum.actualProfit || 0) + b2bGrossProfit;

        // 4. Salaries
        const salaryWhere =
            period === 'day'
                ? { paidDate: { gte: startDate, lte: endDate }, ...regionScope }
                : period === 'year'
                    ? { year, ...regionScope }
                    : { month: month!, year, ...regionScope };

        const salariesSum = await prisma.salaryRecord.aggregate({
            where: salaryWhere,
            _sum: { amount: true },
        });

        const totalSalaries = Number(salariesSum._sum.amount || 0);

        // 5. Net balance by payment method — groupBy / lean selects (same coalesce rules)
        const [
            b2bPaidSales,
            b2bPaymentTxs,
            b2cPayments,
            vendorPayments,
            officeExpensesByMethod,
            personalExpensesByMethod,
            salaryPaymentsByMethod,
            bankMovements,
        ] = await Promise.all([
            prisma.b2BTransaction.groupBy({
                by: ['paymentMethod'],
                where: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    transactionType: 'SALE',
                    paidAmount: { gt: 0 },
                    paymentMethod: { not: null },
                    ...txRegionScope,
                },
                _sum: { paidAmount: true },
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
            prisma.vendorPayment.groupBy({
                by: ['method'],
                where: {
                    paymentDate: { gte: startDate, lte: endDate },
                    status: 'COMPLETED',
                    ...txRegionScope,
                },
                _sum: { amount: true },
            }),
            prisma.officeExpense.groupBy({
                by: ['paymentMethod'],
                where: {
                    expenseDate: { gte: startDate, lte: endDate },
                    ...regionScope,
                },
                _sum: { amount: true },
            }),
            prisma.personalExpense.groupBy({
                by: ['paymentMethod'],
                where: {
                    expenseDate: { gte: startDate, lte: endDate },
                    ...regionScope,
                },
                _sum: { amount: true },
            }),
            prisma.salaryRecord.groupBy({
                by: ['paymentMethod'],
                where: {
                    paidDate: { gte: startDate, lte: endDate },
                    ...regionScope,
                },
                _sum: { amount: true },
            }),
            prisma.bankMovement.findMany({
                where: {
                    movementDate: { gte: startDate, lte: endDate },
                    ...regionScope,
                },
                select: {
                    type: true,
                    fromMethod: true,
                    toMethod: true,
                    amount: true,
                },
            }),
        ]);

        const movementCollections: { method: string | null; amount: number }[] = [];
        const movementDeductions: { method: string | null; amount: number }[] = [];
        for (const movement of bankMovements) {
            const amount = Number(movement.amount || 0);
            if (!amount) continue;
            if (movement.type === 'DEPOSIT') {
                movementCollections.push({ method: movement.toMethod, amount });
            } else if (movement.type === 'TRANSFER') {
                movementDeductions.push({ method: movement.fromMethod, amount });
                movementCollections.push({ method: movement.toMethod, amount });
            } else if (movement.type === 'WITHDRAWAL') {
                movementDeductions.push({ method: movement.fromMethod, amount });
            }
        }

        const activeWallets = await prisma.bankWallet.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });

        const byPaymentMethod = buildPaymentMethodTotals({
            collections: [
                ...b2bPaidSales.map((row) => ({
                    method: row.paymentMethod,
                    amount: Number(row._sum.paidAmount || 0),
                })),
                ...b2bPaymentTxs.map((tx) => ({
                    method: tx.paymentMethod,
                    amount: Number(tx.paidAmount != null ? tx.paidAmount : tx.totalAmount) || 0,
                })),
                ...b2cPayments.map((tx) => ({
                    method: tx.paymentMethod,
                    amount: Number(tx.finalAmount || tx.totalAmount || 0),
                })),
                ...movementCollections,
            ],
            deductions: [
                ...vendorPayments.map((row) => ({
                    method: row.method,
                    amount: Number(row._sum.amount || 0),
                })),
                ...officeExpensesByMethod.map((row) => ({
                    method: row.paymentMethod,
                    amount: Number(row._sum.amount || 0),
                })),
                ...personalExpensesByMethod.map((row) => ({
                    method: row.paymentMethod,
                    amount: Number(row._sum.amount || 0),
                })),
                ...salaryPaymentsByMethod.map((row) => ({
                    method: row.paymentMethod,
                    amount: Number(row._sum.amount || 0),
                })),
                ...movementDeductions,
            ],
            wallets: activeWallets,
        });

        return NextResponse.json({
            totalRevenue,
            totalExpenses,
            totalProfit,
            totalSalaries,
            byPaymentMethod,
            wallets: activeWallets,
            period,
            date,
            month,
            year,
            label,
        });
    } catch (error) {
        console.error('Financial Summary API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
