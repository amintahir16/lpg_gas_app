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

    const [b2cTransChart, b2bTransChart, expensesChart] = await Promise.all([
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
      }),
      prisma.officeExpense.findMany({
        where: { expenseDate: { gte: chartStartDate, lte: endDate } },
        select: { expenseDate: true, amount: true }
      })
    ]);

    let revenueChartData: any[] = [];
    let expensesChartData: any[] = [];

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
      
      expensesChartData = days.map(day => {
        const dateStr = format(day, 'MMM dd');
        const expensesV = expensesChart
          .filter(e => format(new Date(e.expenseDate), 'MMM dd') === dateStr)
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        return { name: dateStr, expenses: expensesV };
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

      expensesChartData = months.map(m => {
        const monthStr = format(m, 'MMM yyyy');
        const expensesV = expensesChart
          .filter(e => format(new Date(e.expenseDate), 'MMM yyyy') === monthStr)
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        return { name: monthStr, expenses: expensesV };
      });
    }

    // 5. Recent Activities
    const [recentB2B, recentB2C] = await Promise.all([
      prisma.b2BTransaction.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, items: true }
      }),
      prisma.b2CTransaction.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          gasItems: true,
          securityItems: true,
          accessoryItems: true,
        }
      })
    ]);

    // ---- Helpers to build human-friendly titles & descriptions ----
    /**
     * Smart fallback formatter for raw cylinderType strings when no Cylinder row
     * exists yet for that type. Extracts capacity (e.g. CYLINDER_11_8KG → 11.8kg)
     * and a clean type-name prefix. Returns "" if nothing meaningful can be
     * extracted, so callers can fallback further.
     */
    const cylinderTypeLabel = (raw: string | null | undefined) => {
      if (!raw) return '';
      const trimmed = raw.trim();
      const capMatch = trimmed.match(/_?(\d+(?:_\d+)?)KG$/i);
      let capacityLabel = '';
      let prefix = trimmed;
      if (capMatch && capMatch.index !== undefined) {
        capacityLabel = `${capMatch[1].replace(/_/g, '.')}kg`;
        prefix = trimmed.slice(0, capMatch.index).replace(/_+$/, '');
      }
      const typeNamePart = prefix
        .replace(/^CYLINDER$/i, '') // drop the generic "CYLINDER" prefix
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      return [typeNamePart, capacityLabel].filter(Boolean).join(' ').trim();
    };

    // Build a map from raw cylinderType string → friendly "{TypeName} {capacity}kg"
    // by sampling one Cylinder row per type. Falls back to formatted cylinderType.
    const cylinderTypesUsed = new Set<string>();
    recentB2B.forEach((t) =>
      t.items.forEach((i) => {
        if (i.cylinderType) cylinderTypesUsed.add(i.cylinderType);
      })
    );
    recentB2C.forEach((t) => {
      t.gasItems.forEach((g) => g.cylinderType && cylinderTypesUsed.add(g.cylinderType));
      t.securityItems.forEach((s) => s.cylinderType && cylinderTypesUsed.add(s.cylinderType));
    });

    const cylinderTypeFriendlyMap = new Map<string, string>();
    if (cylinderTypesUsed.size > 0) {
      const samples = await prisma.cylinder.findMany({
        where: { cylinderType: { in: Array.from(cylinderTypesUsed) } },
        select: { cylinderType: true, typeName: true, capacity: true },
        distinct: ['cylinderType'],
      });
      samples.forEach((s) => {
        const cap = s.capacity != null ? `${Number(s.capacity)}kg` : '';
        const friendly = [s.typeName?.trim(), cap].filter(Boolean).join(' ').trim();
        cylinderTypeFriendlyMap.set(s.cylinderType, friendly || cylinderTypeLabel(s.cylinderType));
      });
    }

    const friendlyCylinderName = (raw: string | null | undefined) => {
      if (!raw) return '';
      return cylinderTypeFriendlyMap.get(raw) || cylinderTypeLabel(raw);
    };

    // Group B2B items by friendly name and sum quantities.
    // Priority for naming: dynamic Cylinder inventory lookup → smart-formatted
    // raw cylinderType → stored productName → "cylinder".
    // This guarantees we never surface raw strings like "CYLINDER_12KG Cylinder"
    // when a real type exists in inventory.
    const groupCylinderItems = (
      items: Array<{ quantity: any; cylinderType?: string | null; productName?: string | null }>
    ): string => {
      if (!items.length) return '';
      const grouped = new Map<string, number>();
      for (const it of items) {
        const fromInventory = it.cylinderType ? cylinderTypeFriendlyMap.get(it.cylinderType) : null;
        const fromRawType = it.cylinderType ? cylinderTypeLabel(it.cylinderType) : '';
        const name =
          fromInventory ||
          fromRawType ||
          it.productName?.trim() ||
          'cylinder';
        grouped.set(name, (grouped.get(name) || 0) + Number(it.quantity || 0));
      }
      return Array.from(grouped.entries())
        .map(([name, qty]) => `${qty} ${name}`)
        .join(', ');
    };

    const buildB2BTitleAndDescription = (t: typeof recentB2B[number]) => {
      const customer = t.customer?.name || 'Unknown';
      const billTag = `Bill ${t.billSno}`;
      const cylinderItems = t.items.filter((i) => i.cylinderType);
      const accessoryItems = t.items.filter((i) => !i.cylinderType);
      const accCount = accessoryItems.reduce((s, i) => s + Number(i.quantity || 0), 0);

      const buildSaleSummary = () => {
        const parts: string[] = [];
        const cylSummary = groupCylinderItems(cylinderItems);
        if (cylSummary) parts.push(cylSummary);
        if (accCount > 0) {
          const accNames = Array.from(
            new Set(accessoryItems.map((a) => a.productName?.trim()).filter(Boolean))
          );
          const accLabel = accNames.length === 1 ? accNames[0] : `accessor${accCount > 1 ? 'ies' : 'y'}`;
          parts.push(`${accCount} ${accLabel}`);
        }
        return parts.join(' + ');
      };

      switch (t.transactionType) {
        case 'SALE': {
          const summary = buildSaleSummary();
          return {
            title: 'B2B Sale',
            description: summary
              ? `${summary} sold to ${customer} • ${billTag}`
              : `Sale to ${customer} • ${billTag}`,
          };
        }
        case 'PAYMENT':
          return {
            title: 'B2B Payment',
            description: `Payment received from ${customer} • ${billTag}`,
          };
        case 'BUYBACK': {
          // Buyback is gas-by-the-kg, not by cylinder count.
          // Total kg = sum(remainingKg * quantity) across cylinder items.
          const totalKg = cylinderItems.reduce((sum, item) => {
            const remaining = Number(item.remainingKg || 0);
            const qty = Number(item.quantity || 0);
            return sum + remaining * qty;
          }, 0);
          const types = Array.from(
            new Set(cylinderItems.map((c) => friendlyCylinderName(c.cylinderType)).filter(Boolean))
          );
          const typeStr = types.length
            ? ` (${types.slice(0, 2).join(', ')}${types.length > 2 ? ` +${types.length - 2}` : ''})`
            : '';
          const kgLabel = totalKg > 0 ? `${Number.isInteger(totalKg) ? totalKg : totalKg.toFixed(1)}kg` : '';
          return {
            title: 'B2B Buyback',
            description: kgLabel
              ? `Bought back ${kgLabel} gas${typeStr} from ${customer} • ${billTag}`
              : `Buyback from ${customer} • ${billTag}`,
          };
        }
        case 'RETURN_EMPTY': {
          const summary = groupCylinderItems(cylinderItems);
          return {
            title: 'B2B Empty Return',
            description: summary
              ? `${summary} empty returned by ${customer} • ${billTag}`
              : `Empty cylinders returned by ${customer} • ${billTag}`,
          };
        }
        case 'ADJUSTMENT':
          return {
            title: 'B2B Adjustment',
            description: `Ledger adjustment for ${customer} • ${billTag}`,
          };
        case 'CREDIT_NOTE':
          return {
            title: 'B2B Credit Note',
            description: `Credit note issued to ${customer} • ${billTag}`,
          };
        default: {
          const summary = buildSaleSummary();
          return {
            title: 'B2B Transaction',
            description: summary ? `${summary} • ${customer} • ${billTag}` : `${customer} • ${billTag}`,
          };
        }
      }
    };

    // Group items by friendly cylinder name and sum quantities
    const groupB2CCylinders = (
      items: Array<{ quantity: any; cylinderType: string }>
    ): string => {
      if (!items.length) return '';
      const grouped = new Map<string, number>();
      for (const it of items) {
        const name = friendlyCylinderName(it.cylinderType) || 'cylinder';
        grouped.set(name, (grouped.get(name) || 0) + Number(it.quantity || 0));
      }
      return Array.from(grouped.entries())
        .map(([name, qty]) => `${qty} ${name}`)
        .join(', ');
    };

    const buildB2CTitleAndDescription = (t: typeof recentB2C[number]) => {
      const customer = t.customer?.name || 'Unknown';
      const billTag = `Bill ${t.billSno}`;
      const gasQty = t.gasItems?.reduce((s, i) => s + Number(i.quantity || 0), 0) || 0;
      const securityHeld = t.securityItems?.filter((s) => !s.isReturn) || [];
      const securityReturned = t.securityItems?.filter((s) => s.isReturn) || [];
      const heldQty = securityHeld.reduce((s, i) => s + Number(i.quantity || 0), 0);
      const returnedQty = securityReturned.reduce((s, i) => s + Number(i.quantity || 0), 0);
      const accQty = t.accessoryItems?.reduce((s, i) => s + Number(i.quantity || 0), 0) || 0;

      const parts: string[] = [];
      if (gasQty > 0) {
        const grouped = groupB2CCylinders(t.gasItems);
        parts.push(grouped ? `${grouped} gas sold` : `${gasQty} cylinder${gasQty > 1 ? 's' : ''} gas sold`);
      }
      if (heldQty > 0) {
        const grouped = groupB2CCylinders(securityHeld);
        parts.push(grouped ? `${grouped} security held` : `${heldQty} security held`);
      }
      if (returnedQty > 0) {
        const grouped = groupB2CCylinders(securityReturned);
        parts.push(grouped ? `${grouped} empty returned` : `${returnedQty} empty returned`);
      }
      if (accQty > 0) {
        const accNames = Array.from(
          new Set((t.accessoryItems || []).map((a) => a.productName?.trim()).filter(Boolean))
        );
        const accLabel = accNames.length === 1 ? accNames[0] : `accessor${accQty > 1 ? 'ies' : 'y'}`;
        parts.push(`${accQty} ${accLabel}`);
      }

      // Pick the dominant type for the badge title
      let title = 'B2C Sale';
      if (gasQty > 0) title = 'B2C Gas Sale';
      else if (returnedQty > 0) title = 'B2C Empty Return';
      else if (heldQty > 0) title = 'B2C Security Hold';
      else if (accQty > 0) title = 'B2C Accessory Sale';

      const description = parts.length
        ? `${parts.join(' • ')} for ${customer} • ${billTag}`
        : `Delivery to ${customer} • ${billTag}`;

      return { title, description };
    };

    const activities = [
      ...recentB2B.map((t) => {
        const { title, description } = buildB2BTitleAndDescription(t);
        return {
          id: `b2b-${t.id}`,
          type: 'b2b_sale',
          title,
          description,
          time: t.createdAt.toISOString(),
          amount: Number(t.totalAmount),
          status: t.voided ? 'error' : 'success',
        };
      }),
      ...recentB2C.map((t) => {
        const { title, description } = buildB2CTitleAndDescription(t);
        return {
          id: `b2c-${t.id}`,
          type: 'b2c_sale',
          title,
          description,
          time: t.createdAt.toISOString(),
          amount: Number(t.totalAmount),
          status: t.voided ? 'error' : 'success',
        };
      }),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);

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
      expensesChartData,
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