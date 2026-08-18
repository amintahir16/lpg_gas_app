'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  ArrowLeftIcon,
  ArrowUpIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import {
  buildFinancialPeriodQuery,
  resolveFinancialPeriod,
  todayLocalDate,
  type FinancialPeriodMode,
} from '@/lib/financial-period';
import { FinancialPeriodFilter } from '@/components/FinancialPeriodFilter';
import { BankMovementActions } from '@/components/BankMovementActions';
import {
  getWalletStyle,
  formatPaymentMethodLabel,
  type BankWalletOption,
} from '@/lib/payment-methods';
import type { BankLedgerEntry } from '@/lib/bank-ledger';
import { TableSkeleton } from '@/components/skeletons';

interface BankLedgerResponse {
  method: string;
  wallet?: {
    name: string;
    code: string;
    type?: string;
    gradient?: string;
    labelTone?: string;
    accountNumber?: string | null;
    accountTitle?: string | null;
    bankName?: string | null;
    description?: string | null;
  };
  entries: BankLedgerEntry[];
  summary: {
    totalIn: number;
    totalOut: number;
    net: number;
    recordCount: number;
    inflowCount: number;
    outflowCount: number;
  };
  label?: string;
}

function readPeriodFromSearch(searchParams: URLSearchParams): {
  period: FinancialPeriodMode;
  date: string;
  month: number;
  year: number;
} {
  const now = new Date();
  const periodParam = searchParams.get('period');
  const period: FinancialPeriodMode =
    periodParam === 'day' || periodParam === 'year' ? periodParam : 'month';
  return {
    period,
    date: searchParams.get('date') || todayLocalDate(),
    month: parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10),
    year: parseInt(searchParams.get('year') || String(now.getFullYear()), 10),
  };
}

export default function BankMethodDetailPage() {
  const router = useRouter();
  const params = useParams<{ method: string }>();
  const searchParams = useSearchParams();

  const methodParam = String(params.method || '');
  const method = methodParam.trim().toUpperCase().replace(/\s+/g, '_');

  const initial = useMemo(() => readPeriodFromSearch(searchParams), [searchParams]);
  const [period, setPeriod] = useState<FinancialPeriodMode>(initial.period);
  const [date, setDate] = useState(initial.date);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BankLedgerEntry[]>([]);
  const [walletMeta, setWalletMeta] = useState<BankLedgerResponse['wallet'] | null>(null);
  const [summary, setSummary] = useState<BankLedgerResponse['summary']>({
    totalIn: 0,
    totalOut: 0,
    net: 0,
    recordCount: 0,
    inflowCount: 0,
    outflowCount: 0,
  });
  const [periodLabel, setPeriodLabel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const resolvedLabel = useMemo(
    () => resolveFinancialPeriod({ period, date, month, year }).label,
    [period, date, month, year]
  );

  const displayLabel = periodLabel || resolvedLabel;
  const methodLabel = walletMeta?.name || formatPaymentMethodLabel(method);
  const styles = getWalletStyle(method, walletMeta);

  useEffect(() => {
    if (!method) return;
    const q = buildFinancialPeriodQuery({ period, date, month, year });
    router.replace(`/financial/banks/${method}?${q}`, { scroll: false });
  }, [method, period, date, month, year, router]);

  useEffect(() => {
    if (!method) {
      setLoading(false);
      setError('Invalid payment method');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const q = buildFinancialPeriodQuery({ period, date, month, year });
        const res = await fetch(`/api/financial/banks/${method}?${q}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load bank records');
        }
        const data: BankLedgerResponse = await res.json();
        if (cancelled) return;
        setEntries(data.entries || []);
        if (data.wallet) {
          setWalletMeta(data.wallet);
        }
        setSummary(
          data.summary || {
            totalIn: 0,
            totalOut: 0,
            net: 0,
            recordCount: 0,
            inflowCount: 0,
            outflowCount: 0,
          }
        );
        setPeriodLabel(data.label || resolvedLabel);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load bank records');
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [method, period, date, month, year, resolvedLabel, refreshKey]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center justify-center h-9 w-9 p-0 shrink-0"
            aria-label="Back"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{methodLabel}</h1>
              <Badge variant="outline" className="text-xs font-semibold">
                {walletMeta?.type || 'WALLET'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Shared company wallet · Branch ledger & movement history
              {walletMeta?.accountNumber && ` · A/C: ${walletMeta.accountNumber}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
          <BankMovementActions
            lockedMethod={method}
            defaultMethod={method}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-100">Total In</p>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <ArrowDownIcon className="w-4 h-4" />
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-32 bg-white/30 rounded-md animate-pulse my-1" />
            ) : (
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(summary.totalIn)}
              </p>
            )}
            <p className="text-xs text-emerald-100 mt-0.5">
              {loading ? 'Calculating collections…' : `${summary.inflowCount} collections`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-500 to-rose-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-rose-100">Total Out</p>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <ArrowUpIcon className="w-4 h-4" />
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-32 bg-white/30 rounded-md animate-pulse my-1" />
            ) : (
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(summary.totalOut)}
              </p>
            )}
            <p className="text-xs text-rose-100 mt-0.5">
              {loading ? 'Calculating payments…' : `${summary.outflowCount} payments & expenses`}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm bg-gradient-to-br ${styles.gradient}`}>
          <CardContent className="p-4">
            <p className={`text-sm font-medium ${styles.labelTone}`}>Net Balance</p>
            {loading ? (
              <div className="h-7 w-32 bg-white/30 rounded-md animate-pulse my-1" />
            ) : (
              <p className="text-2xl font-bold text-white">
                {formatCurrency(summary.net)}
              </p>
            )}
            <p className={`text-xs mt-0.5 ${styles.labelTone}`}>{displayLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-600 to-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-200">Total Records</p>
            {loading ? (
              <div className="h-7 w-20 bg-white/30 rounded-md animate-pulse my-1" />
            ) : (
              <p className="text-2xl font-bold text-white">
                {summary.recordCount}
              </p>
            )}
            <p className="text-xs text-slate-300 mt-0.5">All branches combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table with Region column */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">{methodLabel} Ledger</CardTitle>
          <CardDescription>
            B2B / B2C collections, vendor payments, office expenses, and bank
            deposits / transfers for {displayLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} cols={8} hasSearch={false} />
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No records for this method in the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">Date / Time</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Direction</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Branch / Region</TableHead>
                    <TableHead className="font-semibold">To / From</TableHead>
                    <TableHead className="font-semibold">Recorded By</TableHead>
                    <TableHead className="font-semibold">Details</TableHead>
                    <TableHead className="font-semibold">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const isIn = entry.direction === 'IN';
                    return (
                      <TableRow key={entry.id} className="align-top hover:bg-gray-50/60">
                        <TableCell className="whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{entry.dateLabel}</div>
                          <div className="text-xs text-gray-500">
                            {entry.dayName} · {entry.timeLabel}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900 text-sm">
                            {entry.sourceLabel}
                          </div>
                          <div className="text-xs text-gray-500">{entry.typeDetail}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isIn
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold'
                                : 'border-rose-200 bg-rose-50 text-rose-700 font-semibold'
                            }
                          >
                            {isIn ? 'IN' : 'OUT'}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold whitespace-nowrap ${
                            isIn ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isIn ? '+' : '−'}
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {entry.regionName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <MapPinIcon className="w-3 h-3 text-blue-500" />
                              {entry.regionName}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">
                              All Branches
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{entry.partyName}</div>
                          <div className="text-xs text-gray-500">{entry.partyType}</div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {entry.recordedBy || '—'}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <p className="text-sm text-gray-800 leading-snug">{entry.details}</p>
                          {entry.notes && entry.notes !== entry.details ? (
                            <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap font-mono text-xs">
                          {entry.reference || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
