import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import {
  allocateB2bPaymentsOntoSales,
  buildB2bActivityRow,
  buildB2cActivityRow,
  buildB2cRetentionActivityRow,
  userDisplayName,
  type DashboardSalesActivityRow,
} from '@/lib/dashboard-sales-activities';
import { isOpeningDuesTransaction } from '@/lib/b2b-opening-entries';

export const dynamic = 'force-dynamic';

/**
 * Full-period sales & payments for the dashboard Download / Share report.
 * - Honors day / month / year filter
 * - Excludes pure B2C security deposits (holds)
 * - Includes B2C security retention (25% kept on return) — same as Period Revenue
 * - Lean selects only (no inventory sampling) to protect DB quota
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);
    const { searchParams } = new URL(request.url);

    const resolved = resolveFinancialPeriod({
      period: searchParams.get('period'),
      date: searchParams.get('date'),
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });
    const { startDate, endDate, label: periodLabel } = resolved;

    const b2bWhere: Prisma.B2BTransactionWhereInput = {
      date: { gte: startDate, lte: endDate },
      voided: false,
      transactionType: { in: ['SALE', 'PAYMENT'] },
      ...(regionId ? { regionId } : {}),
    };

    // Sales only — exclude pure B2C security deposits at the DB layer
    const b2cWhere: Prisma.B2CTransactionWhereInput = {
      date: { gte: startDate, lte: endDate },
      voided: false,
      ...(regionId ? { regionId } : {}),
      OR: [
        { gasItems: { some: {} } },
        { accessoryItems: { some: {} } },
        { deliveryCharges: { gt: 0 } },
      ],
    };

    // Three lean queries in parallel — no take/slice (full selected period).
    const [b2bRows, b2cRows, retentionRows] = await Promise.all([
      prisma.b2BTransaction.findMany({
        where: b2bWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          billSno: true,
          createdAt: true,
          createdBy: true,
          voided: true,
          transactionType: true,
          totalAmount: true,
          paidAmount: true,
          unpaidAmount: true,
          paymentStatus: true,
          notes: true,
          paymentReference: true,
          customerId: true,
          customer: { select: { id: true, name: true } },
          items: {
            select: {
              quantity: true,
              pricePerItem: true,
              cylinderType: true,
              cylinderVariantKey: true,
              productName: true,
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.b2CTransaction.findMany({
        where: b2cWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          billSno: true,
          createdAt: true,
          createdBy: true,
          voided: true,
          finalAmount: true,
          totalAmount: true,
          deliveryCharges: true,
          customerId: true,
          customer: { select: { id: true, name: true } },
          gasItems: {
            select: {
              quantity: true,
              cylinderType: true,
              cylinderVariantKey: true,
            },
          },
          accessoryItems: {
            select: {
              quantity: true,
              productName: true,
            },
          },
          // Needed only to strip deposit liability from mixed gas+security bills
          securityItems: {
            select: {
              totalPrice: true,
              isReturn: true,
            },
          },
        },
      }),
      // Same retention source as dashboard Period Revenue
      prisma.b2CCylinderHolding.findMany({
        where: {
          isReturned: true,
          returnDate: { gte: startDate, lte: endDate },
          returnDeduction: { gt: 0 },
          customer: regionScope,
        },
        orderBy: { returnDate: 'desc' },
        select: {
          id: true,
          customerId: true,
          returnDate: true,
          returnDeduction: true,
          quantity: true,
          cylinderType: true,
          cylinderVariantKey: true,
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

    const b2cCreatorIds = Array.from(
      new Set(b2cRows.map((t) => t.createdBy).filter(Boolean) as string[])
    );

    const b2cCreators =
      b2cCreatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: b2cCreatorIds } },
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          })
        : [];

    const b2cCreatorNameById = new Map(
      b2cCreators.map((u) => [u.id, userDisplayName(u) || 'Staff'] as const)
    );

    // Exclude opening cylinder dues — same as dashboard revenue (not earned sales)
    const b2bSalesAndPayments = b2bRows.filter(
      (t) => t.transactionType === 'PAYMENT' || !isOpeningDuesTransaction(t)
    );

    const activities: DashboardSalesActivityRow[] = allocateB2bPaymentsOntoSales(
      [
        ...b2bSalesAndPayments.map((t) => buildB2bActivityRow(t)),
        ...b2cRows.map((t) =>
          buildB2cActivityRow(t, b2cCreatorNameById.get(t.createdBy) || null)
        ),
        ...retentionRows.map((h) => buildB2cRetentionActivityRow(h)),
      ]
    ).sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    const salesTotal = activities
      .filter(
        (a) =>
          a.type === 'b2b_sale' ||
          a.type === 'b2c_sale' ||
          a.type === 'b2c_retention'
      )
      .reduce((s, a) => s + a.totalAmount, 0);

    return NextResponse.json({
      periodLabel,
      period: resolved.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      count: activities.length,
      /** B2B + B2C sales + security retention (matches dashboard Period Revenue sales side). */
      salesTotal,
      activities,
    });
  } catch (error) {
    console.error('Sales activities report error:', error);
    return NextResponse.json(
      { error: 'Failed to build sales activities report' },
      { status: 500 }
    );
  }
}
