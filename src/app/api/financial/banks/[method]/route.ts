import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveRegionId } from '@/lib/region';
import { requireAdmin } from '@/lib/apiAuth';
import { resolveFinancialPeriod } from '@/lib/financial-period';
import { parseBankMethodParam } from '@/lib/bank-ledger';
import {
  buildBankLedgerEntries,
  summarizeLedgerEntries,
} from '@/lib/bank-ledger-query';
import { getWalletStyle } from '@/lib/payment-methods';

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

    const [entries, walletDoc] = await Promise.all([
      buildBankLedgerEntries({
        method,
        regionId,
        startDate,
        endDate,
      }),
      prisma.bankWallet.findFirst({
        where: {
          OR: [
            { code: { equals: method, mode: 'insensitive' } },
            { name: { equals: method, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    const summary = summarizeLedgerEntries(entries);
    const style = getWalletStyle(method, walletDoc);

    const wallet = {
      name: walletDoc?.name || method.replace(/_/g, ' '),
      code: method,
      type: walletDoc?.type || 'BANK',
      gradient: style.gradient,
      labelTone: style.labelTone,
      accountNumber: walletDoc?.accountNumber || null,
      accountTitle: walletDoc?.accountTitle || null,
      bankName: walletDoc?.bankName || null,
      description: walletDoc?.description || null,
    };

    return NextResponse.json({
      method,
      wallet,
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
