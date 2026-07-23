'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import {
  buildFinancialPeriodQuery,
  resolveFinancialPeriod,
  todayLocalDate,
  type FinancialPeriodMode,
} from '@/lib/financial-period';
import { FinancialPeriodFilter } from '@/components/FinancialPeriodFilter';
import {
  PAYMENT_METHOD_CARD_STYLES,
  type PaymentMethodValue,
} from '@/lib/payment-methods';
import { sharePdfBlob } from '@/lib/sharePdf';
import { buildCashClosingPdf, closingPdfFileName } from '@/lib/cash-closing-pdf';

type ClosingLedgerEntry = {
  id: string;
  wallet: PaymentMethodValue;
  walletLabel: string;
  source: string;
  sourceLabel: string;
  direction: 'IN' | 'OUT';
  amount: number;
  occurredAt: string;
  dayName: string;
  dateLabel: string;
  timeLabel: string;
  partyName: string;
  partyType: string;
  recordedBy: string | null;
  details: string;
  reference: string | null;
  notes: string | null;
  typeDetail: string;
};

type WalletClosingRow = {
  wallet: PaymentMethodValue;
  walletLabel: string;
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  recordCount: number;
};

type SourceBreakdownRow = {
  source: string;
  sourceLabel: string;
  direction: 'IN' | 'OUT' | 'MIXED';
  count: number;
  amount: number;
};

type ClosingReportResponse = {
  label: string;
  branchName: string | null;
  generatedAt: string;
  byWallet: WalletClosingRow[];
  bySource: SourceBreakdownRow[];
  entries: ClosingLedgerEntry[];
  totals: {
    totalIn: number;
    totalOut: number;
    netChange: number;
    openingTotal: number;
    closingTotal: number;
    recordCount: number;
  };
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState<FinancialPeriodMode>('day');
  const [date, setDate] = useState(todayLocalDate);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<ClosingReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const periodLabel = useMemo(
    () => resolveFinancialPeriod({ period, date, month, year }).label,
    [period, date, month, year]
  );

  useEffect(() => {
    if (status === 'loading') return;
    if (!isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [status, isSuperAdmin, router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/reports/closing?${buildFinancialPeriodQuery({ period, date, month, year })}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load closing report');
      }
      setReport(data);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : 'Failed to load closing report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading' || !isSuperAdmin) return;
    fetchReport();
  }, [period, date, month, year, status, isSuperAdmin]);

  if (status === 'loading' || !isSuperAdmin) {
    return (
      <div className="p-6 text-center text-gray-500">
        {status === 'loading' ? 'Loading…' : 'Redirecting…'}
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    if (!report) return;
    try {
      setPdfBusy(true);
      const blob = buildCashClosingPdf({
        branchName: report.branchName,
        periodLabel: report.label || periodLabel,
        generatedAt: report.generatedAt,
        totals: report.totals,
        byWallet: report.byWallet,
        bySource: report.bySource,
        entries: report.entries,
      });
      const fileName = closingPdfFileName(report.label || periodLabel);
      await sharePdfBlob({
        blob,
        fileName,
        title: 'Cash Closing Report',
        text: `Cash closing report for ${report.label || periodLabel}`,
      });
    } catch (err) {
      console.error('Closing PDF error:', err);
      alert(err instanceof Error ? err.message : 'Failed to create PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cash Closing Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Closing day / period view of all wallet Ins and Outs
            {report?.branchName ? (
              <span className="text-gray-700"> · {report.branchName}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FinancialPeriodFilter
            period={period}
            date={date}
            month={month}
            year={year}
            onPeriodChange={setPeriod}
            onDateChange={setDate}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={fetchReport}
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleDownloadPdf}
            disabled={!report || loading || pdfBusy}
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
            {pdfBusy ? 'Preparing…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="py-16 text-center text-gray-500">Loading closing report…</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Opening</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {formatCurrency(report.totals.openingTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Total In</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">
                  {formatCurrency(report.totals.totalIn)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">Total Out</p>
                <p className="text-lg font-bold text-rose-700 mt-0.5">
                  {formatCurrency(report.totals.totalOut)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Closing</p>
                <p className="text-lg font-bold text-indigo-700 mt-0.5">
                  {formatCurrency(report.totals.closingTotal)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Net {formatCurrency(report.totals.netChange)} · {report.totals.recordCount} records
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">
              Wallet Closing — {report.label || periodLabel}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {report.byWallet.map((wallet) => {
                const style = PAYMENT_METHOD_CARD_STYLES[wallet.wallet];
                return (
                  <Card key={wallet.wallet} className="overflow-hidden border-0 shadow-md">
                    <div className={`bg-gradient-to-br ${style.gradient} px-3 py-2`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.labelTone}`}>
                        {wallet.walletLabel}
                      </p>
                      <p className="text-xl font-bold text-white mt-0.5">
                        {formatCurrency(wallet.closing)}
                      </p>
                      <p className={`text-[10px] ${style.labelTone}`}>Closing balance</p>
                    </div>
                    <CardContent className="p-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[9px] uppercase text-gray-400 font-semibold">Opening</p>
                        <p className="text-xs font-bold text-gray-800">{formatCurrency(wallet.opening)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-emerald-500 font-semibold">In</p>
                        <p className="text-xs font-bold text-emerald-700">{formatCurrency(wallet.totalIn)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-rose-500 font-semibold">Out</p>
                        <p className="text-xs font-bold text-rose-700">{formatCurrency(wallet.totalOut)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Transfers appear as Out on the source wallet and In on the destination wallet.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Breakdown by Source</CardTitle>
              <CardDescription>Where money came from and where it went</CardDescription>
            </CardHeader>
            <CardContent>
              {report.bySource.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No movements in this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.bySource.map((row) => (
                        <TableRow key={row.source}>
                          <TableCell className="font-medium">{row.sourceLabel}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                row.direction === 'IN'
                                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                  : row.direction === 'OUT'
                                    ? 'border-rose-200 text-rose-700 bg-rose-50'
                                    : 'border-slate-200 text-slate-700'
                              }
                            >
                              {row.direction}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Transaction Ledger ({report.entries.length})
              </CardTitle>
              <CardDescription>
                All Ins and Outs across Cash, Bank Transfer, Easypaisa, and Jazz Cash
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.entries.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No transactions for {report.label || periodLabel}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date / Time</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Dir</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Recorded By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{entry.dateLabel}</div>
                            <div className="text-xs text-gray-500">{entry.timeLabel}</div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{entry.walletLabel}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                entry.direction === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {entry.direction === 'IN' ? (
                                <ArrowDownIcon className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpIcon className="w-3.5 h-3.5" />
                              )}
                              {entry.direction}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold ${
                              entry.direction === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell className="text-sm">{entry.sourceLabel}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{entry.partyName}</div>
                            <div className="text-[10px] text-gray-500">{entry.partyType}</div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[220px]">
                            <span className="line-clamp-2">{entry.details || '—'}</span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {entry.recordedBy || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
