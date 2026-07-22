import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';

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
        const [b2cGasRev, b2cAccRev, b2cDeliveryRev, b2bRevenue] = await Promise.all([
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
            prisma.b2BTransactionItem.aggregate({
                where: {
                    transaction: {
                        date: { gte: startDate, lte: endDate },
                        voided: false,
                        transactionType: 'SALE',
                        ...txRegionScope,
                    },
                },
                _sum: { totalPrice: true },
            }),
        ]);

        const b2cSalesRevenue =
            Number(b2cGasRev._sum.totalPrice || 0) +
            Number(b2cAccRev._sum.totalPrice || 0) +
            Number(b2cDeliveryRev._sum.deliveryCharges || 0);

        const totalRevenue = b2cSalesRevenue + Number(b2bRevenue._sum.totalPrice || 0);

        // 2. Expenses (Office Rent + Daily) — by expenseDate within the selected period
        const expensesSum = await prisma.officeExpense.aggregate({
            where: {
                expenseDate: { gte: startDate, lte: endDate },
                ...regionScope,
            },
            _sum: { amount: true },
        });

        const totalExpenses = Number(expensesSum._sum.amount || 0);

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
                costPrice: true,
                transaction: { select: { customer: { select: { marginCategory: true } } } },
            },
        });

        let b2bGrossProfit = 0;
        b2bItems.forEach(item => {
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

        return NextResponse.json({
            totalRevenue,
            totalExpenses,
            totalProfit,
            totalSalaries,
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
