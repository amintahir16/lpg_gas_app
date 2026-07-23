import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import { buildPaymentMethodTotals } from '@/lib/payment-methods';
import { isOpeningDuesSaleItem } from '@/lib/b2b-opening-entries';

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

        // 1. Revenue — B2C: gas + accessories + delivery only (security deposits/returns are not sales revenue)
        const [b2cGasRev, b2cAccRev, b2cDeliveryRev, b2bRevenueItems] = await Promise.all([
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

        const b2cSalesRevenue =
            Number(b2cGasRev._sum.totalPrice || 0) +
            Number(b2cAccRev._sum.totalPrice || 0) +
            Number(b2cDeliveryRev._sum.deliveryCharges || 0);

        const b2bSalesRevenue = b2bRevenueItems.reduce((sum, item) => {
            if (isOpeningDuesSaleItem(item.transaction, item)) return sum;
            return sum + Number(item.totalPrice || 0);
        }, 0);

        const totalRevenue = b2cSalesRevenue + b2bSalesRevenue;

        // 2. Expenses (office + personal) — by expenseDate within the selected period
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

        // 3. Profit (Gross Profit)
        const b2cProfit = await prisma.b2CTransaction.aggregate({
            where: {
                date: { gte: startDate, lte: endDate },
                voided: false,
                ...txRegionScope,
            },
            _sum: { actualProfit: true },
        });

        const b2bItems = await prisma.b2BTransactionItem.findMany({
            where: {
                transaction: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    transactionType: 'SALE',
                    ...txRegionScope,
                },
            },
            select: {
                cylinderType: true,
                quantity: true,
                totalPrice: true,
                pricePerItem: true,
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
        });

        let b2bGrossProfit = 0;
        b2bItems.forEach(item => {
            if (isOpeningDuesSaleItem(item.transaction, item)) return;
            if (item.cylinderType) {
                const marginPerKg = Number(item.transaction.customer?.marginCategory?.marginPerKg || 0);
                let capacity = 15;
                const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                if (match) {
                    capacity = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
                }
                b2bGrossProfit += Number(item.quantity) * capacity * marginPerKg;
            } else {
                const costPrice = Number(item.costPrice || 0);
                if (costPrice > 0) {
                    b2bGrossProfit += Number(item.totalPrice) - (costPrice * Number(item.quantity));
                } else {
                    b2bGrossProfit += Number(item.totalPrice) * 0.2;
                }
            }
        });

        const totalProfit = Number(b2cProfit._sum.actualProfit || 0) + b2bGrossProfit;

        // 4. Salaries — month/year fields for Month & Year modes; paidDate for Day mode
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

        // 5. Net balance by payment method:
        // collections − vendor payments − office expenses − salaries + deposits/transfers
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
                prisma.officeExpense.findMany({
                    where: {
                        expenseDate: { gte: startDate, lte: endDate },
                        ...regionScope,
                    },
                    select: { amount: true, paymentMethod: true },
                }),
                prisma.personalExpense.findMany({
                    where: {
                        expenseDate: { gte: startDate, lte: endDate },
                        ...regionScope,
                    },
                    select: { amount: true, paymentMethod: true },
                }),
                prisma.salaryRecord.findMany({
                    where: {
                        paidDate: { gte: startDate, lte: endDate },
                        ...regionScope,
                    },
                    select: { amount: true, paymentMethod: true },
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
            }
        }

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
                ...movementCollections,
            ],
            deductions: [
                ...vendorPayments.map((payment) => ({
                    method: payment.method,
                    amount: Number(payment.amount || 0),
                })),
                ...officeExpensesByMethod.map((expense) => ({
                    method: expense.paymentMethod,
                    amount: Number(expense.amount || 0),
                })),
                ...personalExpensesByMethod.map((expense) => ({
                    method: expense.paymentMethod,
                    amount: Number(expense.amount || 0),
                })),
                ...salaryPaymentsByMethod.map((salary) => ({
                    method: salary.paymentMethod,
                    amount: Number(salary.amount || 0),
                })),
                ...movementDeductions,
            ],
        });

        return NextResponse.json({
            totalRevenue,
            totalExpenses,
            totalProfit,
            totalSalaries,
            byPaymentMethod,
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
