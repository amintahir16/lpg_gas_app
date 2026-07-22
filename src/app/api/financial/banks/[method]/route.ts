import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import { formatPaymentMethodLabel, normalizePaymentMethodKey } from '@/lib/payment-methods';
import {
  BANK_LEDGER_SOURCE_LABELS,
  coalesceEventDate,
  formatLedgerDateParts,
  parseBankMethodParam,
  summarizeLineItems,
  userDisplayName,
  type BankLedgerEntry,
} from '@/lib/bank-ledger';

function matchesMethod(
  raw: string | null | undefined,
  method: string
): boolean {
  return normalizePaymentMethodKey(raw) === method;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ method: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { method: methodParam } = await context.params;
    const method = parseBankMethodParam(methodParam);
    if (!method) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

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

    const [
      b2bPaidSales,
      b2bPayments,
      b2cTxs,
      vendorPayments,
      officeExpenses,
      salaryPayments,
      bankMovements,
    ] = await Promise.all([
      prisma.b2BTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          transactionType: 'SALE',
          paidAmount: { gt: 0 },
          paymentMethod: method,
          ...txRegionScope,
        },
        select: {
          id: true,
          billSno: true,
          date: true,
          time: true,
          paidAmount: true,
          totalAmount: true,
          paymentReference: true,
          notes: true,
          createdBy: true,
          customer: { select: { name: true } },
          users: {
            select: { name: true, firstName: true, lastName: true, email: true },
          },
          items: {
            select: {
              productName: true,
              quantity: true,
              totalPrice: true,
              cylinderType: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.b2BTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          transactionType: 'PAYMENT',
          paymentMethod: method,
          ...txRegionScope,
        },
        select: {
          id: true,
          billSno: true,
          date: true,
          time: true,
          paidAmount: true,
          totalAmount: true,
          paymentReference: true,
          notes: true,
          createdBy: true,
          customer: { select: { name: true } },
          users: {
            select: { name: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.b2CTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          voided: false,
          ...txRegionScope,
        },
        select: {
          id: true,
          billSno: true,
          date: true,
          time: true,
          finalAmount: true,
          totalAmount: true,
          paymentMethod: true,
          notes: true,
          createdBy: true,
          customer: { select: { name: true } },
          gasItems: {
            select: {
              cylinderType: true,
              quantity: true,
              totalPrice: true,
            },
          },
          accessoryItems: {
            select: {
              productName: true,
              quantity: true,
              totalPrice: true,
            },
          },
          securityItems: {
            select: {
              cylinderType: true,
              quantity: true,
              totalPrice: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.vendorPayment.findMany({
        where: {
          paymentDate: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
          method,
          ...txRegionScope,
        },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          createdAt: true,
          reference: true,
          description: true,
          method: true,
          createdBy: true,
          createdByUser: {
            select: { name: true, firstName: true, lastName: true, email: true },
          },
          vendor: { select: { companyName: true, contactPerson: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.officeExpense.findMany({
        where: {
          expenseDate: { gte: startDate, lte: endDate },
          ...regionScope,
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          expenseDate: true,
          createdAt: true,
          paymentMethod: true,
          createdBy: true,
        },
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.salaryRecord.findMany({
        where: {
          paidDate: { gte: startDate, lte: endDate },
          ...regionScope,
        },
        select: {
          id: true,
          amount: true,
          month: true,
          year: true,
          paidDate: true,
          createdAt: true,
          paymentMethod: true,
          notes: true,
          createdBy: true,
          user: {
            select: { name: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { paidDate: 'desc' },
      }),
      prisma.bankMovement.findMany({
        where: {
          movementDate: { gte: startDate, lte: endDate },
          OR: [{ toMethod: method }, { fromMethod: method }],
          ...regionScope,
        },
        select: {
          id: true,
          type: true,
          fromMethod: true,
          toMethod: true,
          amount: true,
          movementDate: true,
          createdAt: true,
          notes: true,
          createdBy: true,
          createdByUser: {
            select: { name: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { movementDate: 'desc' },
      }),
    ]);

    const creatorIds = new Set<string>();
    for (const tx of b2cTxs) {
      if (tx.createdBy) creatorIds.add(tx.createdBy);
    }
    for (const expense of officeExpenses) {
      if (expense.createdBy) creatorIds.add(expense.createdBy);
    }
    for (const salary of salaryPayments) {
      if (salary.createdBy) creatorIds.add(salary.createdBy);
    }

    const users =
      creatorIds.size > 0
        ? await prisma.user.findMany({
            where: { id: { in: Array.from(creatorIds) } },
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          })
        : [];
    const userNameById = new Map(
      users.map((u) => [u.id, userDisplayName(u) || u.id] as const)
    );

    const entries: BankLedgerEntry[] = [];

    for (const tx of b2bPaidSales) {
      const amount = Number(tx.paidAmount || 0);
      if (!amount) continue;
      const when = coalesceEventDate(tx.time, tx.date);
      const parts = formatLedgerDateParts(when);
      entries.push({
        id: `b2b-sale-${tx.id}`,
        source: 'B2B_SALE',
        sourceLabel: BANK_LEDGER_SOURCE_LABELS.B2B_SALE,
        direction: 'IN',
        amount,
        ...parts,
        partyName: tx.customer.name,
        partyType: 'B2B Customer',
        recordedBy: userDisplayName(tx.users),
        details: summarizeLineItems(
          tx.items.map((item) => ({
            name: item.productName || item.cylinderType || 'Item',
            quantity: item.quantity,
            totalPrice: Number(item.totalPrice),
          }))
        ),
        reference: tx.paymentReference || tx.billSno || null,
        notes: tx.notes,
        typeDetail: 'Sale (paid at counter)',
      });
    }

    for (const tx of b2bPayments) {
      const amount = Number(tx.paidAmount != null ? tx.paidAmount : tx.totalAmount) || 0;
      if (!amount) continue;
      const when = coalesceEventDate(tx.time, tx.date);
      const parts = formatLedgerDateParts(when);
      entries.push({
        id: `b2b-pay-${tx.id}`,
        source: 'B2B_PAYMENT',
        sourceLabel: BANK_LEDGER_SOURCE_LABELS.B2B_PAYMENT,
        direction: 'IN',
        amount,
        ...parts,
        partyName: tx.customer.name,
        partyType: 'B2B Customer',
        recordedBy: userDisplayName(tx.users),
        details: 'Ledger payment received',
        reference: tx.paymentReference || tx.billSno || null,
        notes: tx.notes,
        typeDetail: 'Payment received',
      });
    }

    for (const tx of b2cTxs) {
      if (!matchesMethod(tx.paymentMethod, method)) continue;
      const amount = Number(tx.finalAmount || tx.totalAmount || 0);
      if (!amount) continue;
      const when = coalesceEventDate(tx.time, tx.date);
      const parts = formatLedgerDateParts(when);
      const lineItems = [
        ...tx.gasItems.map((item) => ({
          name: item.cylinderType || 'Gas',
          quantity: item.quantity,
          totalPrice: Number(item.totalPrice),
        })),
        ...tx.accessoryItems.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          totalPrice: Number(item.totalPrice),
        })),
        ...tx.securityItems.map((item) => ({
          name: `Security ${item.cylinderType || ''}`.trim(),
          quantity: item.quantity,
          totalPrice: Number(item.totalPrice),
        })),
      ];
      entries.push({
        id: `b2c-${tx.id}`,
        source: 'B2C_SALE',
        sourceLabel: BANK_LEDGER_SOURCE_LABELS.B2C_SALE,
        direction: 'IN',
        amount,
        ...parts,
        partyName: tx.customer.name,
        partyType: 'B2C Customer',
        recordedBy: userNameById.get(tx.createdBy) || null,
        details: summarizeLineItems(lineItems),
        reference: tx.billSno || null,
        notes: tx.notes,
        typeDetail: 'B2C sale / collection',
      });
    }

    for (const payment of vendorPayments) {
      const amount = Number(payment.amount || 0);
      if (!amount) continue;
      const when = coalesceEventDate(payment.paymentDate, payment.createdAt);
      const parts = formatLedgerDateParts(when);
      entries.push({
        id: `vendor-${payment.id}`,
        source: 'VENDOR_PAYMENT',
        sourceLabel: BANK_LEDGER_SOURCE_LABELS.VENDOR_PAYMENT,
        direction: 'OUT',
        amount,
        ...parts,
        partyName: payment.vendor.companyName,
        partyType: 'Vendor',
        recordedBy:
          userDisplayName(payment.createdByUser) ||
          (payment.createdBy ? userNameById.get(payment.createdBy) || null : null),
        details:
          payment.description ||
          (payment.vendor.contactPerson
            ? `Paid to ${payment.vendor.contactPerson}`
            : 'Vendor payment'),
        reference: payment.reference || null,
        notes: payment.description,
        typeDetail: 'Vendor payment',
      });
    }

    for (const expense of officeExpenses) {
      if (!matchesMethod(expense.paymentMethod, method)) continue;
      const amount = Number(expense.amount || 0);
      if (!amount) continue;
      const when = coalesceEventDate(expense.expenseDate, expense.createdAt);
      const parts = formatLedgerDateParts(when);
      const typeLabel =
        expense.type === 'RENT'
          ? 'Office Rent'
          : expense.type === 'VEHICLE'
            ? 'Vehicle Expense'
            : 'Daily Expense';
      entries.push({
        id: `expense-${expense.id}`,
        source: 'OFFICE_EXPENSE',
        sourceLabel: BANK_LEDGER_SOURCE_LABELS.OFFICE_EXPENSE,
        direction: 'OUT',
        amount,
        ...parts,
        partyName: 'Office',
        partyType: 'Office',
        recordedBy: userNameById.get(expense.createdBy) || null,
        details: expense.description || typeLabel,
        reference: null,
        notes: expense.description,
        typeDetail: typeLabel,
      });
    }

    for (const salary of salaryPayments) {
      if (!matchesMethod(salary.paymentMethod, method)) continue;
      const amount = Number(salary.amount || 0);
      if (!amount) continue;
      const when = coalesceEventDate(salary.paidDate, salary.createdAt);
      const parts = formatLedgerDateParts(when);
      const employeeName = userDisplayName(salary.user) || 'Employee';
      const monthLabel = new Date(salary.year, salary.month - 1, 1).toLocaleDateString('en-PK', {
        month: 'long',
        year: 'numeric',
      });
      entries.push({
        id: `salary-${salary.id}`,
        source: 'SALARY_PAYMENT',
        sourceLabel: BANK_LEDGER_SOURCE_LABELS.SALARY_PAYMENT,
        direction: 'OUT',
        amount,
        ...parts,
        partyName: employeeName,
        partyType: 'Employee',
        recordedBy: userNameById.get(salary.createdBy) || null,
        details: `Salary for ${monthLabel}`,
        reference: null,
        notes: salary.notes,
        typeDetail: 'Employee salary',
      });
    }

    for (const movement of bankMovements) {
      const amount = Number(movement.amount || 0);
      if (!amount) continue;
      const when = coalesceEventDate(movement.movementDate, movement.createdAt);
      const parts = formatLedgerDateParts(when);
      const recordedBy =
        userDisplayName(movement.createdByUser) ||
        userNameById.get(movement.createdBy) ||
        null;

      if (movement.type === 'DEPOSIT' && matchesMethod(movement.toMethod, method)) {
        entries.push({
          id: `deposit-${movement.id}`,
          source: 'BANK_DEPOSIT',
          sourceLabel: BANK_LEDGER_SOURCE_LABELS.BANK_DEPOSIT,
          direction: 'IN',
          amount,
          ...parts,
          partyName: formatPaymentMethodLabel(method),
          partyType: 'Bank',
          recordedBy,
          details: movement.notes || 'Manual deposit',
          reference: null,
          notes: movement.notes,
          typeDetail: 'Add amount to bank',
        });
        continue;
      }

      if (movement.type === 'TRANSFER') {
        if (matchesMethod(movement.fromMethod, method)) {
          entries.push({
            id: `transfer-out-${movement.id}`,
            source: 'BANK_TRANSFER_OUT',
            sourceLabel: BANK_LEDGER_SOURCE_LABELS.BANK_TRANSFER_OUT,
            direction: 'OUT',
            amount,
            ...parts,
            partyName: formatPaymentMethodLabel(movement.toMethod),
            partyType: 'Bank',
            recordedBy,
            details:
              movement.notes ||
              `Moved to ${formatPaymentMethodLabel(movement.toMethod)}`,
            reference: null,
            notes: movement.notes,
            typeDetail: `Transfer → ${formatPaymentMethodLabel(movement.toMethod)}`,
          });
        }
        if (matchesMethod(movement.toMethod, method)) {
          entries.push({
            id: `transfer-in-${movement.id}`,
            source: 'BANK_TRANSFER_IN',
            sourceLabel: BANK_LEDGER_SOURCE_LABELS.BANK_TRANSFER_IN,
            direction: 'IN',
            amount,
            ...parts,
            partyName: formatPaymentMethodLabel(movement.fromMethod),
            partyType: 'Bank',
            recordedBy,
            details:
              movement.notes ||
              `Received from ${formatPaymentMethodLabel(movement.fromMethod)}`,
            reference: null,
            notes: movement.notes,
            typeDetail: `Transfer ← ${formatPaymentMethodLabel(movement.fromMethod)}`,
          });
        }
      }
    }

    entries.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    const totalIn = entries
      .filter((e) => e.direction === 'IN')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalOut = entries
      .filter((e) => e.direction === 'OUT')
      .reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      method,
      entries,
      summary: {
        totalIn,
        totalOut,
        net: totalIn - totalOut,
        recordCount: entries.length,
        inflowCount: entries.filter((e) => e.direction === 'IN').length,
        outflowCount: entries.filter((e) => e.direction === 'OUT').length,
      },
      period,
      date,
      month,
      year,
      label,
    });
  } catch (error) {
    console.error('Bank ledger API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank ledger' },
      { status: 500 }
    );
  }
}
