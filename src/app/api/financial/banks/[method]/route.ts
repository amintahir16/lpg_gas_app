import { NextRequest, NextResponse } from 'next/server';
import { getActiveRegionId } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import { parseBankMethodParam } from '@/lib/bank-ledger';
import {
  buildBankLedgerEntries,
  summarizeLedgerEntries,
} from '@/lib/bank-ledger-query';

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
    const { searchParams } = new URL(request.url);
    const resolved = resolveFinancialPeriod({
      period: searchParams.get('period'),
      date: searchParams.get('date'),
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });
    const { startDate, endDate, period, month, year, date, label } = resolved;

    const entries = await buildBankLedgerEntries({
      method,
      regionId,
      startDate,
      endDate,
    });
    const summary = summarizeLedgerEntries(entries);

    return NextResponse.json({
      method,
      entries,
      summary,
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
