'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
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

export default function FinancialPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FinancialPeriodMode>('month');
  const [date, setDate] = useState(todayLocalDate);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      router.replace('/financial/wallets');
    }
  }, [session, router]);

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
      console.error('Error fetching financial summary:', error);
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

  const byPaymentMethod = summary?.byPaymentMethod ?? emptyPaymentMethodTotals();

  const cards = [
    {
      title: 'Total Revenue',
      value: summary?.totalRevenue || 0,
      icon: CurrencyDollarIcon,
      gradient: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-100',
      valueColor: 'text-white',
      subtitleColor: 'text-emerald-100/90',
      subtitle: 'From all sales & accessories',
      href: '/financial/revenue',
    },
    {
      title: 'Total Expenses',
      value: summary?.totalExpenses || 0,
      icon: BuildingOfficeIcon,
      gradient: 'from-rose-500 to-red-600',
      textColor: 'text-rose-100',
      valueColor: 'text-white',
      subtitleColor: 'text-rose-100/90',
      subtitle: 'Office, maintenance & rent',
      href: '/financial/expenses',
    },
    {
      title: 'Total Profit',
      value: summary?.totalProfit || 0,
      icon: ChartBarIcon,
      gradient: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-100',
      valueColor: 'text-white',
      subtitleColor: 'text-blue-100/90',
      subtitle: 'Gross revenue minus total costs',
      href: '/financial/profit',
    },
    {
      title: 'Total Salaries',
      value: summary?.totalSalaries || 0,
      icon: UserGroupIcon,
      gradient: 'from-purple-500 to-violet-600',
      textColor: 'text-purple-100',
      valueColor: 'text-white',
      subtitleColor: 'text-purple-100/90',
      subtitle: 'Employee payouts this period',
      href: '/financial/salaries',
    },
  ];

  const visibleCards = isSuperAdmin
    ? cards
    : cards.filter((card) => card.href === '/financial/expenses');

  return (
    <div className="space-y-8">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-sm text-gray-500">
            Overview of revenue, expenses, profitability, and bank accounts
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

      {/* Metric Cards (Super Admin sees all 4; Admin sees Expenses) */}
      <div
        className={`grid gap-6 ${
          visibleCards.length === 1
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {visibleCards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => {
              const q = buildFinancialPeriodQuery({ period, date, month, year });
              router.push(`${card.href}?${q}`);
            }}
            className="text-left group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            style={{
              backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
            }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-100`}
            />
            {/* Subtle decorative circle */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-semibold tracking-wide uppercase ${card.textColor}`}>
                  {card.title}
                </span>
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className={`text-3xl font-extrabold ${card.valueColor} mb-1`}>
                {loading ? (
                  <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse" />
                ) : (
                  formatCurrency(card.value)
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${card.subtitleColor}`}>
                  {card.subtitle}
                </p>
                <div className="flex items-center gap-1 text-white/70 group-hover:text-white transition-colors">
                  <span className="text-xs font-medium">View Details</span>
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* BANKS — net by payment method + deposits/transfers + Manage Wallets */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Wallets & Bank Accounts</h2>
            <p className="text-xs text-gray-500">
              Real-time balance: Collections − vendor payments − expenses + deposits/transfers
            </p>
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
