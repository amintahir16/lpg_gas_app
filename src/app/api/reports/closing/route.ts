import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId } from '@/lib/region';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import {
  BANK_LEDGER_SOURCE_LABELS,
  type BankLedgerEntry,
  type BankLedgerSource,
} from '@/lib/bank-ledger';
import {
  buildBankLedgerEntries,
  getBankLedgerOpeningNet,
  summarizeLedgerEntries,
} from '@/lib/bank-ledger-query';
import {
  PAYMENT_METHOD_OPTIONS,
  formatPaymentMethodLabel,
  type PaymentMethodValue,
} from '@/lib/payment-methods';

export type ClosingLedgerEntry = BankLedgerEntry & {
  wallet: PaymentMethodValue;
  walletLabel: string;
};

export type WalletClosingRow = {
  wallet: PaymentMethodValue;
  walletLabel: string;
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  recordCount: number;
};

export type SourceBreakdownRow = {
  source: BankLedgerSource;
  sourceLabel: string;
  direction: 'IN' | 'OUT' | 'MIXED';
  count: number;
  amount: number;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const regionId = getActiveRegionId(request);
    const { searchParams } = new URL(request.url);
    const resolved = resolveFinancialPeriod({
      period: searchParams.get('period'),
      date: searchParams.get('date'),
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });
    const { startDate, endDate, period, month, year, date, label } = resolved;

    const methods = PAYMENT_METHOD_OPTIONS.map((o) => o.value);

    // Period detail rows + SQL opening nets (same business rules, no full-history hydrate).
    // Sequential per wallet keeps the connection pool stable under load.
    const walletResults: Array<{
      method: PaymentMethodValue;
      entries: Awaited<ReturnType<typeof buildBankLedgerEntries>>;
      opening: number;
      summary: ReturnType<typeof summarizeLedgerEntries>;
    }> = [];

    for (const method of methods) {
      const [entries, opening] = await Promise.all([
        buildBankLedgerEntries({
          method,
          regionId,
          startDate,
          endDate,
        }),
        getBankLedgerOpeningNet({
          method,
          regionId,
          beforeDate: startDate,
        }),
      ]);
      walletResults.push({
        method,
        entries,
        opening,
        summary: summarizeLedgerEntries(entries),
      });
    }

    const byWallet: WalletClosingRow[] = walletResults.map(
      ({ method, opening, summary }) => ({
        wallet: method,
        walletLabel: formatPaymentMethodLabel(method),
        opening,
        totalIn: summary.totalIn,
        totalOut: summary.totalOut,
        closing: opening + summary.totalIn - summary.totalOut,
        recordCount: summary.recordCount,
      })
    );

    const entries: ClosingLedgerEntry[] = walletResults
      .flatMap(({ method, entries: walletEntries }) =>
        walletEntries.map((entry) => ({
          ...entry,
          // Prefix id with wallet so transfer in/out on different wallets stay unique when merged
          id: `${method}:${entry.id}`,
          wallet: method,
          walletLabel: formatPaymentMethodLabel(method),
        }))
      )
      .sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );

    const sourceMap = new Map<
      BankLedgerSource,
      { count: number; amountIn: number; amountOut: number }
    >();
    for (const entry of entries) {
      const current = sourceMap.get(entry.source) || {
        count: 0,
        amountIn: 0,
        amountOut: 0,
      };
      current.count += 1;
      if (entry.direction === 'IN') current.amountIn += entry.amount;
      else current.amountOut += entry.amount;
      sourceMap.set(entry.source, current);
    }

    const bySource: SourceBreakdownRow[] = Array.from(sourceMap.entries())
      .map(([source, stats]) => {
        const hasIn = stats.amountIn > 0;
        const hasOut = stats.amountOut > 0;
        const direction: SourceBreakdownRow['direction'] =
          hasIn && hasOut ? 'MIXED' : hasOut ? 'OUT' : 'IN';
        return {
          source,
          sourceLabel: BANK_LEDGER_SOURCE_LABELS[source],
          direction,
          count: stats.count,
          amount:
            direction === 'OUT'
              ? stats.amountOut
              : direction === 'IN'
                ? stats.amountIn
                : stats.amountIn + stats.amountOut,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const totals = {
      totalIn: byWallet.reduce((sum, w) => sum + w.totalIn, 0),
      totalOut: byWallet.reduce((sum, w) => sum + w.totalOut, 0),
      netChange: 0,
      openingTotal: byWallet.reduce((sum, w) => sum + w.opening, 0),
      closingTotal: byWallet.reduce((sum, w) => sum + w.closing, 0),
      recordCount: entries.length,
    };
    totals.netChange = totals.totalIn - totals.totalOut;

    let branchName: string | null = null;
    if (regionId) {
      const region = await prisma.region.findUnique({
        where: { id: regionId },
        select: { name: true },
      });
      branchName = region?.name || null;
    }

    return NextResponse.json({
      period,
      date,
      month,
      year,
      label,
      branchName,
      byWallet,
      bySource,
      entries,
      totals,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Closing report API error:', error);
    const details =
      error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: 'Failed to build cash closing report', details },
      { status: 500 }
    );
  }
}
