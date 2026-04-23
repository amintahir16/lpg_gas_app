import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // 1. Revenue
        const [b2cRevenue, b2bRevenue] = await Promise.all([
            prisma.b2CTransaction.aggregate({
                where: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                },
                _sum: { finalAmount: true },
            }),
            prisma.b2BTransactionItem.aggregate({
                where: {
                    transaction: {
                        date: { gte: startDate, lte: endDate },
                        voided: false,
                        transactionType: 'SALE',
                    },
                },
                _sum: { totalPrice: true },
            }),
        ]);

        const totalRevenue = Number(b2cRevenue._sum.finalAmount || 0) + Number(b2bRevenue._sum.totalPrice || 0);

        // 2. Expenses (Office Rent + Daily)
        const expensesSum = await prisma.officeExpense.aggregate({
            where: {
                expenseDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
        });

        const totalExpenses = Number(expensesSum._sum.amount || 0);

        // 3. Profit (Gross Profit)
        // B2C Gross Profit is directly stored
        const b2cProfit = await prisma.b2CTransaction.aggregate({
            where: {
                date: { gte: startDate, lte: endDate },
                voided: false,
            },
            _sum: { actualProfit: true },
        });

        // B2B Gross Profit needs to be calculated or approximated
        // For B2B, we use a margin-based calculation in the profit page
        // Here we'll do a similar aggregation for summary
        const b2bItems = await prisma.b2BTransactionItem.findMany({
            where: {
                transaction: {
                    date: { gte: startDate, lte: endDate },
                    voided: false,
                    transactionType: 'SALE',
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
                // Extract capacity from cylinderType (e.g., DOMESTIC_11_8KG -> 11.8)
                let capacity = 15;
                const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
                if (match) {
                    capacity = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
                }
                b2bGrossProfit += Number(item.quantity) * capacity * marginPerKg;
            } else {
                // Accessories profit
                const costPrice = Number(item.costPrice || 0);
                if (costPrice > 0) {
                    b2bGrossProfit += Number(item.totalPrice) - (costPrice * Number(item.quantity));
                } else {
                    b2bGrossProfit += Number(item.totalPrice) * 0.2; // 20% fallback
                }
            }
        });

        const totalProfit = Number(b2cProfit._sum.actualProfit || 0) + b2bGrossProfit;

        // 4. Salaries
        const salariesSum = await prisma.salaryRecord.aggregate({
            where: {
                month,
                year,
            },
            _sum: { amount: true },
        });

        const totalSalaries = Number(salariesSum._sum.amount || 0);

        return NextResponse.json({
            totalRevenue,
            totalExpenses,
            totalProfit,
            totalSalaries,
            month,
            year,
        });

    } catch (error) {
        console.error('Financial Summary API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
