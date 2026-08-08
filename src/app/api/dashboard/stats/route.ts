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
import { isOpeningDuesSaleItem, isOpeningDuesTransaction } from '@/lib/b2b-opening-entries';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import { calculateGasLineProfit } from '@/lib/gas-profit';
import {
  allocateB2bPaymentsOntoSales,
  b2cSalesActivityWhere,
  b2cSalesAmount,
  type DashboardSalesActivityRow,
} from '@/lib/dashboard-sales-activities';

export const dynamic = 'force-dynamic';

/**
 * Detect cylinder-purchase vendor categories (asset CAPEX), matching the
 * same slug/name patterns used elsewhere in the vendors module.
 * These payments must NOT reduce Actual Profit on the dashboard.
 */
function isCylinderPurchaseCategory(slug?: string | null, name?: string | null): boolean {
  const normalizedSlug = (slug ?? '').toLowerCase().replace(/[_-]/g, '');
  const normalizedName = (name ?? '').toLowerCase().replace(/[_-]/g, '');
  const patterns = [
    'cylinderpurchase',
    'cylinderspurchase',
    'cylinderpurchases',
    'cylinderspurchases',
  ];
  return patterns.some(
    (pattern) => normalizedSlug.includes(pattern) || normalizedName.includes(pattern)
  );
}

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

    // Chart window (same rules as before) — computed early so KPI+chart share one fetch
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

    const kpiStartMs = startDate.getTime();
    const kpiEndMs = endDate.getTime();
    const chartWiderThanKpi = chartStartDate.getTime() < kpiStartMs;

    // When chart window is wider than the KPI period (day mode = last 7 days),
    // load KPI txs (with items for profit) separately from lean chart rows.
    // Month/year keep a single fetch — same numbers, no extra round-trips.
    const b2cKpiSelect = {
      date: true,
      totalAmount: true,
      deliveryCharges: true,
      actualProfit: true,
      securityItems: { select: { totalPrice: true } },
    } as const;
    const b2bKpiSelect = {
      date: true,
      customerId: true,
      notes: true,
      paymentReference: true,
      totalAmount: true,
      transactionType: true,
      items: {
        select: {
          quantity: true,
          pricePerItem: true,
          totalPrice: true,
          costPrice: true,
          cylinderType: true,
        },
      },
    } as const;
    const b2cChartLeanSelect = {
      date: true,
      totalAmount: true,
      securityItems: { select: { totalPrice: true } },
    } as const;
    const b2bChartLeanSelect = {
      date: true,
      totalAmount: true,
    } as const;

    const [totalB2b, totalB2c, cylinderStatusGroups, b2cTransInRange, b2bTransInRange, b2cTransChart, b2bTransChart] =
      await Promise.all([
        prisma.customer.count({ where: { isActive: true, ...regionScope } }),
        prisma.b2CCustomer.count({ where: { isActive: true, ...regionScope } }),
        prisma.cylinder.groupBy({
          by: ['currentStatus'],
          where: { ...regionScope },
          _count: { id: true },
        }),
        chartWiderThanKpi
          ? prisma.b2CTransaction.findMany({
              where: {
                date: { gte: startDate, lte: endDate },
                voided: false,
                ...txRegionScope,
              },
              select: b2cKpiSelect,
            })
          : Promise.resolve(null as null),
        chartWiderThanKpi
          ? prisma.b2BTransaction.findMany({
              where: {
                date: { gte: startDate, lte: endDate },
                voided: false,
                transactionType: 'SALE',
                ...txRegionScope,
              },
              select: b2bKpiSelect,
            })
          : Promise.resolve(null as null),
        prisma.b2CTransaction.findMany({
          where: {
            date: { gte: chartStartDate, lte: endDate },
            voided: false,
            ...txRegionScope,
          },
          select: chartWiderThanKpi ? b2cChartLeanSelect : b2cKpiSelect,
        }),
        prisma.b2BTransaction.findMany({
          where: {
            date: { gte: chartStartDate, lte: endDate },
            voided: false,
            transactionType: 'SALE',
            ...txRegionScope,
          },
          select: chartWiderThanKpi ? b2bChartLeanSelect : b2bKpiSelect,
        }),
      ]);

    const totalCustomers = totalB2b + totalB2c;

    const statusCount = (status: string) =>
      cylinderStatusGroups.find((g) => g.currentStatus === status)?._count.id || 0;
    const activeCylinders = statusCount('WITH_CUSTOMER');
    const emptyCylinders = statusCount('EMPTY');
    const fullCylinders = statusCount('FULL');

    const cylinderStatusData = [
      { name: 'With Customers', value: activeCylinders, fill: '#3b82f6' },
      { name: 'Full (In Stock)', value: fullCylinders, fill: '#10b981' },
      { name: 'Empty (In Stock)', value: emptyCylinders, fill: '#f59e0b' },
    ];

    const b2cKpiRows = (
      chartWiderThanKpi ? b2cTransInRange! : b2cTransChart
    ).filter((t) => {
      if (chartWiderThanKpi) return true;
      const ms = new Date(t.date).getTime();
      return ms >= kpiStartMs && ms <= kpiEndMs;
    }) as Array<{
      date: Date;
      totalAmount: unknown;
      deliveryCharges?: unknown;
      actualProfit?: unknown;
      securityItems?: Array<{ totalPrice: unknown }>;
    }>;

    type B2bKpiRow = {
      customerId: string;
      notes?: string | null;
      paymentReference?: string | null;
      totalAmount?: string | number | { toString(): string } | null;
      transactionType?: string;
      items?: Array<{
        quantity: string | number | { toString(): string };
        pricePerItem: string | number | { toString(): string } | null;
        totalPrice: string | number | { toString(): string } | null;
        costPrice: string | number | { toString(): string } | null;
        cylinderType: string | null;
      }>;
    };

    let b2bKpiRows: B2bKpiRow[];
    if (chartWiderThanKpi) {
      b2bKpiRows = b2bTransInRange as unknown as B2bKpiRow[];
    } else {
      b2bKpiRows = (b2bTransChart as unknown as Array<B2bKpiRow & { date: Date }>).filter(
        (t) => {
          const ms = new Date(t.date).getTime();
          return ms >= kpiStartMs && ms <= kpiEndMs;
        }
      );
    }

    let rangeRevenue = 0;
    let rangeProfit = 0;

    b2cKpiRows.forEach((t) => {
      // Sales revenue = gas + accessories + delivery; exclude all security line amounts (deposits & refunds)
      let securityLines = 0;
      if (t.securityItems) {
        t.securityItems.forEach((secItem) => {
          securityLines += Number(secItem.totalPrice || 0);
        });
      }
      const b2cRevenue =
        Number(t.totalAmount || 0) - securityLines + Number(t.deliveryCharges || 0);

      rangeRevenue += b2cRevenue;
      // Security return retention is also folded into Period Revenue / Actual Profit below (via returnDeduction)
      rangeProfit += Number(t.actualProfit || 0);
    });

    // We need margins for B2B profit calculation (region-scoped)
    const customersForMargin = await prisma.customer.findMany({
      where: {
        id: { in: Array.from(new Set(b2bKpiRows.map((t) => t.customerId))) },
        ...regionScope,
      },
      select: { id: true, marginCategoryId: true },
    });

    const marginCategoryIds = Array.from(
      new Set(customersForMargin.map((c) => c.marginCategoryId).filter(Boolean))
    );
    const marginCategories = await prisma.marginCategory.findMany({
      where: { id: { in: marginCategoryIds as string[] } },
    });

    const marginMap = new Map();
    marginCategories.forEach((mc) => marginMap.set(mc.id, Number(mc.marginPerKg)));
    const custMarginMap = new Map();
    customersForMargin.forEach((c) => custMarginMap.set(c.id, c.marginCategoryId));

    b2bKpiRows.forEach((tx) => {
      if (isOpeningDuesTransaction(tx)) return;

      const marginCategoryId = custMarginMap.get(tx.customerId);
      const marginPerKg = marginCategoryId ? marginMap.get(marginCategoryId) || 0 : 0;

      (tx.items || []).forEach((item) => {
        if (isOpeningDuesSaleItem(tx, item as any)) return;

        const qty = Number(item.quantity);
        const sellPrice = Number(item.pricePerItem);
        const costPrice = Number(item.costPrice || 0);
        rangeRevenue += sellPrice * qty;

        if (item.cylinderType) {
          let capacity = getCapacityFromTypeString(item.cylinderType) || 15;
          const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
          if (!(capacity > 0) && match) {
            capacity = match[2]
              ? parseFloat(`${match[1]}.${match[2]}`)
              : parseFloat(match[1]);
          } else if (!(capacity > 0)) {
            const customMatch = item.cylinderType.match(/(\d+(?:\.\d+)?)kg/);
            if (customMatch) {
              capacity = parseFloat(customMatch[1]);
            }
          }
          rangeProfit += calculateGasLineProfit({
            pricePerItem: sellPrice,
            quantity: qty,
            costPrice,
            capacityKg: capacity,
            marginPerKg,
          });
        } else {
          if (costPrice > 0) {
            rangeProfit += (sellPrice - costPrice) * qty;
          } else {
            // Fallback 20% margin for accessories
            rangeProfit += sellPrice * 0.2 * qty;
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

    const [expensesSum, personalExpensesSum, purchasesSum, paymentsSum, vendorCategories] =
      await Promise.all([
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
      }),
      prisma.vendorCategoryConfig.findMany({
        where: regionScope,
        select: { id: true, slug: true, name: true },
      }),
    ]);

    const rangeExpenses =
      Number(expensesSum._sum.amount || 0) + Number(personalExpensesSum._sum.amount || 0);
    const rangePurchases = Number(purchasesSum._sum.totalPrice || 0);
    const rangePayments = Number(paymentsSum._sum.amount || 0);
    const vendorBalance = rangePurchases - rangePayments;

    // Cylinder-purchase vendor payments are asset CAPEX — exclude from Actual Profit only.
    // Vendor Payments KPI and Vendor Balance continue to use full rangePayments (unchanged).
    const cylinderPurchaseCategoryIds = vendorCategories
      .filter((c) => isCylinderPurchaseCategory(c.slug, c.name))
      .map((c) => c.id);

    // 3.6. Salaries (within date range, by paidDate)
    // B2C security return retention (25% of original deposit) is included in Period Revenue below
    const [deductiblePaymentsSum, salariesSum, b2cSecurityRetentionSum] = await Promise.all([
      cylinderPurchaseCategoryIds.length === 0
        ? Promise.resolve(paymentsSum)
        : prisma.vendorPayment.aggregate({
            where: {
              paymentDate: { gte: startDate, lte: endDate },
              status: 'COMPLETED',
              ...regionScope,
              vendor: {
                NOT: {
                  categoryId: { in: cylinderPurchaseCategoryIds },
                },
              },
            },
            _sum: { amount: true },
          }),
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
    const deductibleVendorPayments = Number(deductiblePaymentsSum._sum.amount || 0);
    const rangeSalaries = Number(salariesSum._sum.amount || 0);
    const b2cSecurityRetention = Number(b2cSecurityRetentionSum._sum.returnDeduction || 0);

    // Include B2C security retention (25% kept on cylinder return) in Period Revenue.
    // Actual Profit formula stays equivalent: retention is now inside rangeRevenue (not added twice).
    rangeRevenue += b2cSecurityRetention;

    // 3.7. Actual Profit = Revenue (incl. security retention) - Expenses - Salaries - Vendor payments (excl. cylinder purchase)
    const actualProfit =
      rangeRevenue - rangeExpenses - rangeSalaries - deductibleVendorPayments;

    // 4. Chart expense rows (B2C/B2B chart txs already loaded above)
    const [expensesChart, personalExpensesChart] = await Promise.all([
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
    // Slim selects: only fields used for titles/amounts (same numbers & labels).
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
        select: {
          id: true,
          billSno: true,
          transactionType: true,
          totalAmount: true,
          paidAmount: true,
          unpaidAmount: true,
          paymentStatus: true,
          customerId: true,
          createdAt: true,
          createdBy: true,
          voided: true,
          customer: { select: { id: true, name: true } },
          users: {
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          },
          items: {
            select: {
              quantity: true,
              cylinderType: true,
              cylinderVariantKey: true,
              productName: true,
              remainingKg: true,
            },
          },
        },
      }),
      prisma.b2CTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          ...txRegionScope,
          // Preview list: sales only — exclude pure B2C security deposits
          ...b2cSalesActivityWhere,
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          billSno: true,
          totalAmount: true,
          finalAmount: true,
          deliveryCharges: true,
          customerId: true,
          createdAt: true,
          createdBy: true,
          voided: true,
          customer: { select: { id: true, name: true } },
          gasItems: {
            select: {
              quantity: true,
              cylinderType: true,
              cylinderVariantKey: true,
            },
          },
          securityItems: {
            select: { totalPrice: true },
          },
          accessoryItems: {
            select: { quantity: true, productName: true },
          },
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
            description: `Direct payment from ${customer} (applied to open sales) • ${billTag}`,
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
      const accQty = t.accessoryItems?.reduce((s, i) => s + Number(i.quantity || 0), 0) || 0;

      const parts: string[] = [];
      if (gasQty > 0) {
        const grouped = groupB2CCylinders(t.gasItems);
        parts.push(grouped ? `${grouped} gas sold` : `${gasQty} cylinder${gasQty > 1 ? 's' : ''} gas sold`);
      }
      // Security deposits are excluded from this sales feed (not listed in parts).
      if (accQty > 0) {
        const accNames = Array.from(
          new Set((t.accessoryItems || []).map((a) => a.productName?.trim()).filter(Boolean))
        );
        const accLabel = accNames.length === 1 ? accNames[0] : `accessor${accQty > 1 ? 'ies' : 'y'}`;
        parts.push(`${accQty} ${accLabel}`);
      }

      // Pick the dominant type for the badge title (security-only rows are filtered upstream)
      let title = 'B2C Sale';
      if (gasQty > 0) title = 'B2C Gas Sale';
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

    const activityRows = [
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
          status: t.voided ? ('error' as const) : ('success' as const),
        };
      }),
      ...recentB2C.map((t) => {
        const { title, description } = buildB2CTitleAndDescription(t);
        // Strip security deposit liability from mixed bills
        const totalAmount = b2cSalesAmount({
          finalAmount: t.finalAmount,
          totalAmount: t.totalAmount,
          deliveryCharges: t.deliveryCharges,
          securityItems: t.securityItems,
        });
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
          status: t.voided ? ('error' as const) : ('success' as const),
        };
      }),
    ].filter((a) => a.title !== 'B2C Security Hold');

    // Apply direct B2B payments onto open sales for display (FIFO) — does not change DB.
    const allocated = allocateB2bPaymentsOntoSales(
      activityRows as DashboardSalesActivityRow[]
    );
    const paidById = new Map(allocated.map((a) => [a.id, a]));
    const activities = activityRows
      .map((row) => {
        const updated = paidById.get(row.id);
        if (!updated) return row;
        return {
          ...row,
          paidAmount: updated.paidAmount,
          unpaidAmount: updated.unpaidAmount,
          paymentStatus: updated.paymentStatus,
          amount: updated.amount,
        };
      })
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