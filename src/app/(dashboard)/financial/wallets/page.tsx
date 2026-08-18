'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  buildFinancialPeriodQuery,
  resolveFinancialPeriod,
  todayLocalDate,
  type FinancialPeriodMode,
} from '@/lib/financial-period';
import { FinancialPeriodFilter } from '@/components/FinancialPeriodFilter';
import { PaymentMethodStatCards } from '@/components/PaymentMethodStatCards';
import { BankMovementActions } from '@/components/BankMovementActions';
import { WalletManagementModal } from '@/components/WalletManagementModal';
import {
  emptyPaymentMethodTotals,
  type BankWalletOption,
} from '@/lib/payment-methods';
import { WalletsGridSkeleton } from '@/components/skeletons';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  totalSalaries: number;
  byPaymentMethod?: Record<string, number>;
  wallets?: BankWalletOption[];
  period?: FinancialPeriodMode;
  date?: string | null;
  month?: number | null;
  year?: number;
  label?: string;
}

export default function WalletsManagementPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FinancialPeriodMode>('month');
  const [date, setDate] = useState(todayLocalDate);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const periodLabel = useMemo(
    () =>
      resolveFinancialPeriod({
        period,
        date,
        month,
        year,
      }).label,
    [period, date, month, year]
  );

  useEffect(() => {
    fetchSummary();
  }, [period, date, month, year]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/financial/summary?${buildFinancialPeriodQuery({ period, date, month, year })}`
      );
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching wallets summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !summary) {
    return <WalletsGridSkeleton />;
  }

  const byPaymentMethod = summary?.byPaymentMethod ?? emptyPaymentMethodTotals();

  return (
    <div className="space-y-8">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallets & Bank Accounts</h1>
          <p className="text-sm text-gray-500">
            Real-time balance: Collections − vendor payments − expenses + deposits/transfers
          </p>
        </div>
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
      </div>

      {/* Action Bar + Wallets Grid */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-gray-100">
          <div className="text-xs text-gray-500 font-medium">
            Active Accounts & Floats ({summary?.wallets?.length ?? 4}) · {periodLabel}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWalletModalOpen(true)}
              className="h-9 text-xs font-bold border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 shadow-sm"
            >
              <BuildingLibraryIcon className="w-4 h-4 mr-1.5 text-blue-600" />
              Manage Wallets
            </Button>
            <BankMovementActions onSaved={fetchSummary} />
          </div>
        </div>

        <PaymentMethodStatCards
          totals={byPaymentMethod}
          wallets={summary?.wallets}
          loading={loading}
          formatCurrency={formatCurrency}
          onMethodClick={(method) => {
            const q = buildFinancialPeriodQuery({ period, date, month, year });
            router.push(`/financial/banks/${method}?${q}`);
          }}
        />
      </div>

      {/* Wallet Management Modal */}
      <WalletManagementModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onChanged={fetchSummary}
      />
    </div>
  );
}
