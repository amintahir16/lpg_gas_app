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
  PAYMENT_METHOD_CARD_STYLES,
  formatPaymentMethodLabel,
  isSelectablePaymentMethod,
  type PaymentMethodValue,
} from '@/lib/payment-methods';
import type { BankLedgerEntry } from '@/lib/bank-ledger';

interface BankLedgerResponse {
  method: PaymentMethodValue;
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

  const methodKey = String(params.method || '').toUpperCase();
  const methodValid = isSelectablePaymentMethod(methodKey);
  const method = methodValid ? (methodKey as PaymentMethodValue) : null;

  const initial = useMemo(() => readPeriodFromSearch(searchParams), [searchParams]);
  const [period, setPeriod] = useState<FinancialPeriodMode>(initial.period);
  const [date, setDate] = useState(initial.date);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BankLedgerEntry[]>([]);
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
  const methodLabel = method ? formatPaymentMethodLabel(method) : 'Unknown';
  const styles = method
    ? PAYMENT_METHOD_CARD_STYLES[method]
    : { gradient: 'from-gray-500 to-gray-600', labelTone: 'text-gray-100' };

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
            onClick={() => router.push('/financial')}
            className="flex items-center justify-center h-9 w-9 p-0 shrink-0"
            aria-label="Back"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${styles.gradient} text-white shadow-sm`}
              >
                <BanknotesIcon className="w-5 h-5" />
              </span>
              {methodLabel}
            </h1>
            <p className="text-sm text-gray-600">
              Every record tied to this payment method — who, whom, what, when, and amount
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
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
            lockedMethod={method || undefined}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-emerald-100 flex items-center gap-1">
              <ArrowDownIcon className="w-4 h-4" /> Money In
            </p>
            <p className="text-2xl font-bold text-white">
              {loading ? '…' : formatCurrency(summary.totalIn)}
            </p>
            <p className="text-xs text-emerald-100 mt-0.5">
              {summary.inflowCount} inflow record{summary.inflowCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-500 to-rose-600">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-rose-100 flex items-center gap-1">
              <ArrowUpIcon className="w-4 h-4" /> Money Out
            </p>
            <p className="text-2xl font-bold text-white">
              {loading ? '…' : formatCurrency(summary.totalOut)}
            </p>
            <p className="text-xs text-rose-100 mt-0.5">
              {summary.outflowCount} outflow record{summary.outflowCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm bg-gradient-to-br ${styles.gradient}`}>
          <CardContent className="p-4">
            <p className={`text-sm font-medium ${styles.labelTone}`}>Net Balance</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '…' : formatCurrency(summary.net)}
            </p>
            <p className={`text-xs mt-0.5 ${styles.labelTone}`}>{displayLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-600 to-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-200">Total Records</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '…' : summary.recordCount}
            </p>
            <p className="text-xs text-slate-300 mt-0.5">All sources combined</p>
          </CardContent>
        </Card>
      </div>

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
            <div className="py-10 text-center text-gray-500">Loading records…</div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No records for this method in the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">Date / Time</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Direction</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
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
                      <TableRow key={entry.id} className="align-top">
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
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
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
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
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
