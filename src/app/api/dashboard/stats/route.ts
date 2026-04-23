import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  startOfMonth,
  subMonths,
  format,
  eachMonthOfInterval,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  differenceInDays
} from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to last 30 days if not provided
    const endDate = endDateParam ? endOfDay(new Date(endDateParam)) : endOfDay(new Date());
    const startDate = startDateParam
      ? startOfDay(new Date(startDateParam))
      : startOfDay(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));

    const isDaily = differenceInDays(endDate, startDate) <= 35;

    // 1. Total Customers (point in time)
    const [totalB2b, totalB2c] = await Promise.all([
      prisma.customer.count({ where: { isActive: true } }),
      prisma.b2CCustomer.count({ where: { isActive: true } })
    ]);
    const totalCustomers = totalB2b + totalB2c;

    // 2. Active Cylinders (point in time)
    const [activeCylinders, emptyCylinders, fullCylinders] = await Promise.all([
      prisma.cylinder.count({ where: { currentStatus: 'WITH_CUSTOMER' } }),
      prisma.cylinder.count({ where: { currentStatus: 'EMPTY' } }),
      prisma.cylinder.count({ where: { currentStatus: 'FULL' } })
    ]);

    const cylinderStatusData = [
      { name: 'With Customers', value: activeCylinders, fill: '#3b82f6' },
      { name: 'Full (In Stock)', value: fullCylinders, fill: '#10b981' },
      { name: 'Empty (In Stock)', value: emptyCylinders, fill: '#f59e0b' },
    ];

    // 3. Transactions for KPIs (within date range)
    const [b2cTransInRange, b2bTransInRange] = await Promise.all([
      prisma.b2CTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false
        },
        select: {
          totalAmount: true,
          actualProfit: true,
          securityItems: { select: { totalPrice: true } }
        }
      }),
      prisma.b2BTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          transactionType: 'SALE'
        },
        select: {
          customerId: true,
          items: {
            select: { quantity: true, pricePerItem: true, costPrice: true, cylinderType: true }
          }
        }
      })
    ]);

    let rangeRevenue = 0;
    let rangeProfit = 0;

    b2cTransInRange.forEach(t => {
      let b2cRevenue = Number(t.totalAmount || 0);
      // Deduct security deposits/returns from revenue (they are liabilities, not true sales revenue)
      if (t.securityItems) {
        t.securityItems.forEach(secItem => {
          b2cRevenue -= Number(secItem.totalPrice || 0);
        });
      }

      rangeRevenue += b2cRevenue;
      // Note: 25% deduction on returns is already calculated and saved into actualProfit during B2C transaction creation
      rangeProfit += Number(t.actualProfit || 0);
    });

    // We need margins for B2B profit calculation
    const customersForMargin = await prisma.customer.findMany({
      where: { id: { in: Array.from(new Set(b2bTransInRange.map(t => t.customerId))) } },
      select: { id: true, marginCategoryId: true }
    });

    const marginCategoryIds = Array.from(new Set(customersForMargin.map(c => c.marginCategoryId).filter(Boolean)));
    const marginCategories = await prisma.marginCategory.findMany({
      where: { id: { in: marginCategoryIds as string[] } }
    });

    const marginMap = new Map();
    marginCategories.forEach(mc => marginMap.set(mc.id, Number(mc.marginPerKg)));
    const custMarginMap = new Map();
    customersForMargin.forEach(c => custMarginMap.set(c.id, c.marginCategoryId));

    b2bTransInRange.forEach(tx => {
      const marginCategoryId = custMarginMap.get(tx.customerId);
      const marginPerKg = marginCategoryId ? (marginMap.get(marginCategoryId) || 0) : 0;

      tx.items.forEach(item => {
        const qty = Number(item.quantity);
        const sellPrice = Number(item.pricePerItem);
        const costPrice = Number(item.costPrice || 0);
        rangeRevenue += (sellPrice * qty);

        if (item.cylinderType) {
          let capacity = 15;
          const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
          if (match) {
            capacity = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
          } else {
            const customMatch = item.cylinderType.match(/(\d+(?:\.\d+)?)kg/);
            if (customMatch) {
              capacity = parseFloat(customMatch[1]);
            }
          }
          rangeProfit += (qty * capacity * marginPerKg);
        } else {
          if (costPrice > 0) {
            rangeProfit += (sellPrice - costPrice) * qty;
          } else {
            // Fallback 20% margin for accessories
            rangeProfit += (sellPrice * 0.20) * qty;
          }
        }
      });
    });

    // 3.5. Expenses and Vendor Balance (within date range)
    const [expensesSum, purchasesSum, paymentsSum] = await Promise.all([
      prisma.officeExpense.aggregate({
        where: {
          expenseDate: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      prisma.purchaseEntry.aggregate({
        where: {
          purchaseDate: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' } // Purchases in period
        },
        _sum: { totalPrice: true }
      }),
      prisma.vendorPayment.aggregate({
        where: {
          paymentDate: { gte: startDate, lte: endDate },
          status: 'COMPLETED' // Payments in period
        },
        _sum: { amount: true }
      })
    ]);

    const rangeExpenses = Number(expensesSum._sum.amount || 0);
    const rangePurchases = Number(purchasesSum._sum.totalPrice || 0);
    const rangePayments = Number(paymentsSum._sum.amount || 0);
    const vendorBalance = rangePurchases - rangePayments;

    // 4. Chart Data (Last 6 Months or Daily)
    const chartStartDate = isDaily ? startDate : startOfMonth(subMonths(endDate, 5));

    const [b2cTransChart, b2bTransChart] = await Promise.all([
      prisma.b2CTransaction.findMany({
        where: { date: { gte: chartStartDate, lte: endDate }, voided: false },
        select: {
          date: true,
          totalAmount: true,
          securityItems: { select: { totalPrice: true } }
        }
      }),
      prisma.b2BTransaction.findMany({
        where: { date: { gte: chartStartDate, lte: endDate }, voided: false, transactionType: 'SALE' },
        select: { date: true, totalAmount: true }
      })
    ]);

    let revenueChartData: any[] = [];

    if (isDaily) {
      const days = eachDayOfInterval({ start: chartStartDate, end: endDate });
      revenueChartData = days.map(day => {
        const dateStr = format(day, 'MMM dd');
        const b2cV = b2cTransChart
          .filter(t => format(new Date(t.date), 'MMM dd') === dateStr)
          .reduce((s, t) => {
            let amount = Number(t.totalAmount || 0);
            if (t.securityItems) {
              t.securityItems.forEach(sec => amount -= Number(sec.totalPrice || 0));
            }
            return s + amount;
          }, 0);
        const b2bV = b2bTransChart.filter(t => format(new Date(t.date), 'MMM dd') === dateStr).reduce((s, t) => s + Number(t.totalAmount || 0), 0);
        return { name: dateStr, b2b: b2bV, b2c: b2cV };
      });
    } else {
      const months = eachMonthOfInterval({ start: chartStartDate, end: endDate });
      revenueChartData = months.map(m => {
        const monthStr = format(m, 'MMM yyyy');
        const b2cV = b2cTransChart
          .filter(t => format(new Date(t.date), 'MMM yyyy') === monthStr)
          .reduce((s, t) => {
            let amount = Number(t.totalAmount || 0);
            if (t.securityItems) {
              t.securityItems.forEach(sec => amount -= Number(sec.totalPrice || 0));
            }
            return s + amount;
          }, 0);
        const b2bV = b2bTransChart.filter(t => format(new Date(t.date), 'MMM yyyy') === monthStr).reduce((s, t) => s + Number(t.totalAmount || 0), 0);
        return { name: monthStr, b2b: b2bV, b2c: b2cV };
      });
    }

    // 5. Recent Activities
    const [recentB2B, recentB2C] = await Promise.all([
      prisma.b2BTransaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: true }
      }),
      prisma.b2CTransaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: true }
      })
    ]);

    const activities = [
      ...recentB2B.map(t => ({
        id: `b2b-${t.id}`,
        type: 'b2b_sale',
        title: 'B2B Sale',
        description: `Sold to ${t.customer?.name || 'Unknown'} (Bill: ${t.billSno})`,
        time: t.createdAt.toISOString(),
        amount: Number(t.totalAmount),
        status: t.voided ? 'error' : 'success'
      })),
      ...recentB2C.map(t => ({
        id: `b2c-${t.id}`,
        type: 'b2c_sale',
        title: 'B2C Sale',
        description: `Delivered to ${t.customer?.name || 'Unknown'} (Bill: ${t.billSno})`,
        time: t.createdAt.toISOString(),
        amount: Number(t.totalAmount),
        status: t.voided ? 'error' : 'success'
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    // 6. Accessories Inventory (individual items per category)
    const accessoryColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#a855f7', '#f43f5e'];
    const customItems = await prisma.customItem.findMany({
      where: { isActive: true, quantity: { gt: 0 } },
      select: { name: true, type: true, quantity: true }
    });

    // Helper to adjust hex color brightness
    const adjustColor = (hex: string, percent: number): string => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent)));
      const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(2.55 * percent)));
      return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    // Assign a base color per category, then shift shade per item within that category
    const categorySet = [...new Set(customItems.map(i => i.name))];
    const categoryColorMap: Record<string, string> = {};
    categorySet.forEach((cat, i) => { categoryColorMap[cat] = accessoryColors[i % accessoryColors.length]; });

    const categoryItemIndex: Record<string, number> = {};
    const accessoryInventoryData = customItems.map(item => {
      categoryItemIndex[item.name] = (categoryItemIndex[item.name] || 0);
      const shade = adjustColor(categoryColorMap[item.name], categoryItemIndex[item.name] * -12);
      categoryItemIndex[item.name]++;
      return {
        name: `${item.name} - ${item.type}`,
        value: item.quantity,
        fill: shade
      };
    });

    const stats = {
      kpis: {
        totalCustomers,
        activeCylinders,
        rangeRevenue,
        rangeProfit,
        rangeExpenses,
        vendorBalance,
      },
      revenueChartData,
      cylinderStatusData,
      accessoryInventoryData,
      recentActivities: activities
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}