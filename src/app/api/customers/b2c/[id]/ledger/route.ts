import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const { id: customerId } = await params;

        const skip = (page - 1) * limit;

        // Get customer details
        const customer = await prisma.b2CCustomer.findUnique({
            where: { id: customerId },
            include: {
                marginCategory: true,
                cylinderHoldings: {
                    where: { isReturned: false }
                }
            }
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Build date filter
        const dateWhere: any = { customerId };

        if (startDate || endDate) {
            dateWhere.date = {};
            if (startDate) {
                dateWhere.date.gte = new Date(startDate);
            }
            if (endDate) {
                // Include the entire end date
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                dateWhere.date.lte = endDateObj;
            }
        }

        // Fetch transactions
        // For B2C, we don't necessarily need "running balance" in the same complex way if they are always fully paid,
        // but we'll fetch them all if we want to calculate dynamic totals based on filters, or just fetch paginated.
        // However, to calculate TOTAL profit matching the filter (or lifetime), we might need all.
        // The B2B implementation calculated lifetime stats. B2C "Total Profit" on profile usually implies lifetime.

        // Performance Optimization: B2C might have MANY small transactions. Fetching ALL might be heavy.
        // But consistent with B2B logic (which fetches all), we will stick to it for now unless performance issues arise.
        const allTransactions = await prisma.b2CTransaction.findMany({
            where: { customerId },
            include: {
                gasItems: true,
                accessoryItems: true,
                securityItems: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        console.log(`[B2C API] Fetching ledger for ${customerId}. Found ${allTransactions.length} transactions.`);

        // Calculate Summary Stats from ALL transactions (Lifetime)
        let totalIn = 0;
        let totalOut = 0;
        let totalProfit = 0;

        allTransactions.forEach(tx => {
            const finalAmount = parseFloat(tx.finalAmount.toString());
            const profit = parseFloat(tx.actualProfit.toNumber().toString());

            // B2C Transaction is a SALE
            totalOut += finalAmount;
            // Assume fully paid for B2C
            totalIn += finalAmount;

            totalProfit += profit;
        });

        // Filter for display
        let displayTransactions = allTransactions;
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date(0);
            const end = endDate ? new Date(endDate) : new Date(9999, 11, 31);
            if (endDate) end.setHours(23, 59, 59, 999);

            displayTransactions = allTransactions.filter(tx => {
                const d = new Date(tx.date);
                return d >= start && d <= end;
            });
        }

        // Reverse for display (newest first)
        // Note: B2B did reverse AFTER calculating running balances.
        const sortedDisplayTransactions = [...displayTransactions].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime() ||
            new Date(b.time).getTime() - new Date(a.time).getTime()
        );

        // Apply pagination
        const paginatedTransactions = sortedDisplayTransactions.slice(skip, skip + limit);
        const totalCount = displayTransactions.length;
        const pages = Math.ceil(totalCount / limit);

        // Calculate Total Security Held from active holdings
        const totalSecurityHeld = customer.cylinderHoldings.reduce((sum, holding) => {
            const qty = holding.quantity;
            const amt = parseFloat(holding.securityAmount.toString());
            return sum + (qty * amt);
        }, 0);

        return NextResponse.json({
            customer,
            transactions: paginatedTransactions,
            summary: {
                netBalance: 0,
                totalTransactions: allTransactions.length,
                totalIn,
                totalOut,
                totalProfit,
                totalSecurityHeld,
                cylinderHoldingsCount: customer.cylinderHoldings.reduce((acc, curr) => acc + curr.quantity, 0)
            },
            pagination: {
                page,
                limit,
                total: totalCount,
                pages,
            },
        });

    } catch (error) {
        console.error('Error fetching B2C customer ledger:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customer ledger' },
            { status: 500 }
        );
    }
}
