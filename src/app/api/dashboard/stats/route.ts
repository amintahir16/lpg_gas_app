import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  startOfMonth,
  format,
  eachMonthOfInterval,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  differenceInDays
} from 'date-fns';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { parseCylinderVariantKey } from '@/lib/cylinder-variant-key';
import { getCapacityFromTypeString, getCylinderTypeDisplayName } from '@/lib/cylinder-utils';
import { resolveFinancialPeriod } from '@/lib/financial-period';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);
    const txRegionScope = regionId ? { regionId } : {};
    const { searchParams } = new URL(request.url);

    const hasPeriodParams =
      searchParams.has('period') ||
      searchParams.has('date') ||
      searchParams.has('month') ||
      searchParams.has('year');

    let startDate: Date;
    let endDate: Date;
    let period: 'day' | 'month' | 'year' = 'month';
    let periodLabel = '';

    if (hasPeriodParams) {
      const resolved = resolveFinancialPeriod({
        period: searchParams.get('period'),
        date: searchParams.get('date'),
        month: searchParams.get('month'),
        year: searchParams.get('year'),
      });
      startDate = resolved.startDate;
      endDate = resolved.endDate;
      period = resolved.period;
      periodLabel = resolved.label;
    } else {
      // Legacy startDate/endDate support (presets)
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');
      endDate = endDateParam ? endOfDay(new Date(endDateParam)) : endOfDay(new Date());
      startDate = startDateParam
        ? startOfDay(new Date(startDateParam))
        : startOfDay(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));
      periodLabel = `${format(startDate, 'dd MMM yyyy')} – ${format(endDate, 'dd MMM yyyy')}`;
    }

    const rangeDays = differenceInDays(endDate, startDate);

    // 1. Total Customers (point in time)
    const [totalB2b, totalB2c] = await Promise.all([
      prisma.customer.count({ where: { isActive: true, ...regionScope } }),
      prisma.b2CCustomer.count({ where: { isActive: true, ...regionScope } })
    ]);
    const totalCustomers = totalB2b + totalB2c;

    // 2. Active Cylinders (point in time)
    const [activeCylinders, emptyCylinders, fullCylinders] = await Promise.all([
      prisma.cylinder.count({ where: { currentStatus: 'WITH_CUSTOMER', ...regionScope } }),
      prisma.cylinder.count({ where: { currentStatus: 'EMPTY', ...regionScope } }),
      prisma.cylinder.count({ where: { currentStatus: 'FULL', ...regionScope } })
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
          voided: false,
          ...txRegionScope,
        },
        select: {
          totalAmount: true,
          deliveryCharges: true,
          actualProfit: true,
          securityItems: { select: { totalPrice: true } }
        }
      }),
      prisma.b2BTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          transactionType: 'SALE',
          ...txRegionScope,
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
      // Sales revenue = gas + accessories + delivery; exclude all security line amounts (deposits & refunds)
      let securityLines = 0;
      if (t.securityItems) {
        t.securityItems.forEach(secItem => {
          securityLines += Number(secItem.totalPrice || 0);
        });
      }
      const b2cRevenue = Number(t.totalAmount || 0) - securityLines + Number(t.deliveryCharges || 0);

      rangeRevenue += b2cRevenue;
      // Security return retention (25% of original deposit) is included in actualProfit at transaction creation
      rangeProfit += Number(t.actualProfit || 0);
    });

    // We need margins for B2B profit calculation (region-scoped)
    const customersForMargin = await prisma.customer.findMany({
      where: { id: { in: Array.from(new Set(b2bTransInRange.map(t => t.customerId))) }, ...regionScope },
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
    // RENT expenses use expenseDate=15th of month which can be in the future,
    // so we also match RENT by month/year for any month that overlaps the range.
    const monthsCovered: Array<{ month: number; year: number }> = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor <= endDate) {
      monthsCovered.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const rentMonthConditions = monthsCovered.map(m => ({ type: 'RENT' as const, month: m.month, year: m.year }));

    const [expensesSum, personalExpensesSum, purchasesSum, paymentsSum] = await Promise.all([
      prisma.officeExpense.aggregate({
        where: {
          ...regionScope,
          OR: [
            { expenseDate: { gte: startDate, lte: endDate }, type: { in: ['DAILY', 'VEHICLE'] } },
            ...rentMonthConditions,
          ],
        },
        _sum: { amount: true }
      }),
      prisma.personalExpense.aggregate({
        where: {
          ...regionScope,
          expenseDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.purchaseEntry.aggregate({
        where: {
          purchaseDate: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
          ...regionScope,
        },
        _sum: { totalPrice: true }
      }),
      prisma.vendorPayment.aggregate({
        where: {
          paymentDate: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
          ...regionScope,
        },
        _sum: { amount: true }
      })
    ]);

    const rangeExpenses =
      Number(expensesSum._sum.amount || 0) + Number(personalExpensesSum._sum.amount || 0);
    const rangePurchases = Number(purchasesSum._sum.totalPrice || 0);
    const rangePayments = Number(paymentsSum._sum.amount || 0);
    const vendorBalance = rangePurchases - rangePayments;

    // 3.6. Salaries (within date range, by paidDate)
    // B2C security return retention (25% of original deposit): real profit but not part of sales revenue
    const [salariesSum, b2cSecurityRetentionSum] = await Promise.all([
      prisma.salaryRecord.aggregate({
        where: {
          paidDate: { gte: startDate, lte: endDate },
          ...regionScope,
        },
        _sum: { amount: true },
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
    ]);
    const rangeSalaries = Number(salariesSum._sum.amount || 0);
    const b2cSecurityRetention = Number(b2cSecurityRetentionSum._sum.returnDeduction || 0);

    // 3.7. Actual Profit = Revenue - Expenses - Salaries - Vendor payments + B2C security retention
    const actualProfit =
      rangeRevenue - rangeExpenses - rangeSalaries - rangePayments + b2cSecurityRetention;

    // 4. Chart Data — aligned to selected period
    // Day: last 7 days ending on selected day (KPI still that day)
    // Month: daily bars within the month
    // Year: monthly bars for all 12 months
    let chartStartDate: Date;
    let isDaily: boolean;
    if (period === 'day') {
      chartStartDate = startOfDay(new Date(endDate));
      chartStartDate.setDate(chartStartDate.getDate() - 6);
      isDaily = true;
    } else if (period === 'month' || rangeDays <= 35) {
      chartStartDate = startOfDay(startDate);
      isDaily = true;
    } else {
      chartStartDate = startOfMonth(startDate);
      isDaily = false;
    }

    const [b2cTransChart, b2bTransChart, expensesChart, personalExpensesChart] = await Promise.all([
      prisma.b2CTransaction.findMany({
        where: { date: { gte: chartStartDate, lte: endDate }, voided: false, ...txRegionScope },
        select: {
          date: true,
          totalAmount: true,
          securityItems: { select: { totalPrice: true } }
        }
      }),
      prisma.b2BTransaction.findMany({
        where: { date: { gte: chartStartDate, lte: endDate }, voided: false, transactionType: 'SALE', ...txRegionScope },
        select: { date: true, totalAmount: true }
      }),
      prisma.officeExpense.findMany({
        where: {
          ...regionScope,
          expenseDate: { gte: chartStartDate, lte: endDate },
          type: { in: ['DAILY', 'VEHICLE'] },
        },
        select: { expenseDate: true, amount: true, type: true }
      }),
      prisma.personalExpense.findMany({
        where: {
          ...regionScope,
          expenseDate: { gte: chartStartDate, lte: endDate },
        },
        select: { expenseDate: true, amount: true }
      }),
    ]);

    let revenueChartData: any[] = [];
    let expensesChartData: any[] = [];

    if (isDaily) {
      const days = eachDayOfInterval({ start: chartStartDate, end: endDate });
      revenueChartData = days.map(day => {
        const dateStr = format(day, 'MMM dd');
        const dayKey = format(day, 'yyyy-MM-dd');
        const b2cV = b2cTransChart
          .filter(t => format(new Date(t.date), 'yyyy-MM-dd') === dayKey)
          .reduce((s, t) => {
            let amount = Number(t.totalAmount || 0);
            if (t.securityItems) {
              t.securityItems.forEach(sec => amount -= Number(sec.totalPrice || 0));
            }
            return s + amount;
          }, 0);
        const b2bV = b2bTransChart
          .filter(t => format(new Date(t.date), 'yyyy-MM-dd') === dayKey)
          .reduce((s, t) => s + Number(t.totalAmount || 0), 0);
        return { name: dateStr, b2b: b2bV, b2c: b2cV };
      });
      
      expensesChartData = days.map(day => {
        const dateStr = format(day, 'MMM dd');
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayRows = expensesChart.filter(e => format(new Date(e.expenseDate), 'yyyy-MM-dd') === dayKey);
        const officeExpenses = dayRows
          .filter(e => e.type === 'DAILY')
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        const vehicleExpenses = dayRows
          .filter(e => e.type === 'VEHICLE')
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        const personalExpenses = personalExpensesChart
          .filter(e => format(new Date(e.expenseDate), 'yyyy-MM-dd') === dayKey)
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        return { name: dateStr, officeExpenses, vehicleExpenses, personalExpenses };
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
        const monthRows = expensesChart.filter(e => format(new Date(e.expenseDate), 'MMM yyyy') === monthStr);
        const officeExpenses = monthRows
          .filter(e => e.type === 'DAILY')
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        const vehicleExpenses = monthRows
          .filter(e => e.type === 'VEHICLE')
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        const personalExpenses = personalExpensesChart
          .filter(e => format(new Date(e.expenseDate), 'MMM yyyy') === monthStr)
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        return { name: monthStr, officeExpenses, vehicleExpenses, personalExpenses };
      });
    }

    // 5. Recent Activities — sales & payments in the selected period
    const [recentB2B, recentB2C] = await Promise.all([
      prisma.b2BTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          transactionType: { in: ['SALE', 'PAYMENT'] },
          ...txRegionScope,
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          items: true,
          users: {
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.b2CTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          ...txRegionScope,
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          gasItems: true,
          securityItems: true,
          accessoryItems: true,
        },
      }),
    ]);

    const b2cCreatorIds = Array.from(
      new Set(recentB2C.map((t) => t.createdBy).filter(Boolean))
    );
    const b2cCreators =
      b2cCreatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: b2cCreatorIds } },
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          })
        : [];
    const b2cCreatorNameById = new Map(
      b2cCreators.map((u) => {
        const name =
          u.name?.trim() ||
          `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
          u.email?.trim() ||
          'Staff';
        return [u.id, name] as const;
      })
    );

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
        where: { cylinderType: { in: Array.from(cylinderTypesUsed) }, ...regionScope },
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

    const variantAwareCylinderName = (input: { cylinderType?: string | null; cylinderVariantKey?: string | null }) => {
      const vk = input.cylinderVariantKey?.trim();
      if (vk && vk.includes('|||')) {
        const p = parseCylinderVariantKey(vk);
        if (p?.cylinderType) {
          const cap = p.capacity ?? getCapacityFromTypeString(p.cylinderType);
          if (p.normalizedTypeNameLower && p.normalizedTypeNameLower !== 'null') {
            const tn = p.normalizedTypeNameLower.replace(/\b\w/g, (c) => c.toUpperCase());
            return `${tn} ${cap}kg`;
          }
          return `${getCylinderTypeDisplayName(p.cylinderType)} ${cap}kg`;
        }
      }
      return friendlyCylinderName(input.cylinderType);
    };

    // Group B2B items by friendly name and sum quantities.
    // Priority for naming: dynamic Cylinder inventory lookup → smart-formatted
    // raw cylinderType → stored productName → "cylinder".
    // This guarantees we never surface raw strings like "CYLINDER_12KG Cylinder"
    // when a real type exists in inventory.
    const groupCylinderItems = (
      items: Array<{ quantity: any; cylinderType?: string | null; cylinderVariantKey?: string | null; productName?: string | null }>
    ): string => {
      if (!items.length) return '';
      const grouped = new Map<string, number>();
      for (const it of items) {
        const fromVariant = it.cylinderType || it.cylinderVariantKey ? variantAwareCylinderName(it) : '';
        const fromInventory = it.cylinderType ? cylinderTypeFriendlyMap.get(it.cylinderType) : null;
        const fromRawType = it.cylinderType ? cylinderTypeLabel(it.cylinderType) : '';
        const name =
          fromVariant ||
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
      items: Array<{ quantity: any; cylinderType: string; cylinderVariantKey?: string | null }>
    ): string => {
      if (!items.length) return '';
      const grouped = new Map<string, number>();
      for (const it of items) {
        const name = variantAwareCylinderName(it) || 'cylinder';
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

    const userDisplay = (user: {
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null | undefined) => {
      if (!user) return null;
      return (
        user.name?.trim() ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        user.email?.trim() ||
        null
      );
    };

    const activities = [
      ...recentB2B.map((t) => {
        const { title, description } = buildB2BTitleAndDescription(t);
        const totalAmount = Number(t.totalAmount || 0);
        const isPayment = t.transactionType === 'PAYMENT';
        const paidAmount = isPayment
          ? totalAmount
          : Number(t.paidAmount != null ? t.paidAmount : 0);
        const unpaidAmount = isPayment
          ? 0
          : Number(
              t.unpaidAmount != null
                ? t.unpaidAmount
                : Math.max(0, totalAmount - paidAmount)
            );
        const paymentStatus = isPayment
          ? 'RECEIVED'
          : t.paymentStatus ||
            (unpaidAmount <= 0 && totalAmount > 0
              ? 'FULLY_PAID'
              : paidAmount > 0
                ? 'PARTIAL'
                : 'UNPAID');

        return {
          id: `b2b-${t.id}`,
          transactionId: t.id,
          channel: 'b2b' as const,
          transactionType: t.transactionType,
          type: isPayment ? 'b2b_payment' : 'b2b_sale',
          title,
          description,
          time: t.createdAt.toISOString(),
          amount: totalAmount,
          totalAmount,
          paidAmount,
          unpaidAmount,
          paymentStatus,
          customerId: t.customerId,
          customerName: t.customer?.name || 'Unknown',
          billSno: t.billSno,
          recordedBy: userDisplay(t.users),
          recordedById: t.createdBy,
          status: t.voided ? 'error' : 'success',
        };
      }),
      ...recentB2C.map((t) => {
        const { title, description } = buildB2CTitleAndDescription(t);
        const totalAmount = Number(t.finalAmount || t.totalAmount || 0);
        return {
          id: `b2c-${t.id}`,
          transactionId: t.id,
          channel: 'b2c' as const,
          transactionType: 'SALE',
          type: 'b2c_sale',
          title,
          description,
          time: t.createdAt.toISOString(),
          amount: totalAmount,
          totalAmount,
          paidAmount: totalAmount,
          unpaidAmount: 0,
          paymentStatus: 'FULLY_PAID',
          customerId: t.customerId,
          customerName: t.customer?.name || 'Unknown',
          billSno: t.billSno,
          recordedBy: b2cCreatorNameById.get(t.createdBy) || null,
          recordedById: t.createdBy,
          status: t.voided ? 'error' : 'success',
        };
      }),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 25);

    // 6. Accessories Inventory — slices per item type, grouped by category with gradient shades
    const accessoryColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#a855f7', '#f43f5e'];
    const customItems = await prisma.customItem.findMany({
      where: { isActive: true, quantity: { gt: 0 }, ...regionScope },
      select: { name: true, type: true, quantity: true }
    });

    const adjustColor = (hex: string, percent: number): string => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent)));
      const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(2.55 * percent)));
      return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const itemsByCategory = new Map<string, { type: string; quantity: number }[]>();
    for (const item of customItems) {
      const list = itemsByCategory.get(item.name) ?? [];
      list.push({ type: item.type, quantity: item.quantity });
      itemsByCategory.set(item.name, list);
    }

    const sortedCategories = [...itemsByCategory.entries()].sort((a, b) => {
      const totalA = a[1].reduce((sum, i) => sum + i.quantity, 0);
      const totalB = b[1].reduce((sum, i) => sum + i.quantity, 0);
      return totalB - totalA;
    });

    const accessoryInventoryData: {
      name: string;
      category: string;
      type: string;
      value: number;
      fill: string;
      categoryColor: string;
    }[] = [];

    sortedCategories.forEach(([category, items], categoryIndex) => {
      const baseColor = accessoryColors[categoryIndex % accessoryColors.length];
      const sortedItems = [...items].sort((a, b) => b.quantity - a.quantity);

      sortedItems.forEach((item, itemIndex) => {
        const shade = adjustColor(baseColor, itemIndex * -14);
        accessoryInventoryData.push({
          name: `${category} - ${item.type}`,
          category,
          type: item.type,
          value: item.quantity,
          fill: shade,
          categoryColor: baseColor,
        });
      });
    });

    const stats = {
      kpis: {
        totalCustomers,
        activeCylinders,
        rangeRevenue,
        rangeProfit,
        rangeExpenses,
        rangeSalaries,
        actualProfit,
        rangePayments,
        vendorBalance,
      },
      period,
      label: periodLabel,
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