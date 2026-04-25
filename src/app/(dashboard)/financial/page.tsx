'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { CustomSelect } from '@/components/ui/select-custom';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  totalSalaries: number;
  month: number;
  year: number;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
export default function FinancialPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSummary();
  }, [month, year]);
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/financial/summary?month=${month}&year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
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

  const cards = [
    {
      title: 'Revenue',
      value: summary?.totalRevenue || 0,
      subtitle: 'Total sales revenue',
      icon: CurrencyDollarIcon,
      href: '/financial/revenue',
      gradient: 'from-emerald-500 to-emerald-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700',
      iconBg: 'text-emerald-200',
      subtitleColor: 'text-emerald-100',
      valueColor: 'text-white',
    },
    {
      title: 'Expenses',
      value: summary?.totalExpenses || 0,
      subtitle: 'Office rent & daily expenses',
      icon: BuildingOfficeIcon,
      href: '/financial/expenses',
      gradient: 'from-rose-500 to-orange-500',
      hoverGradient: 'hover:from-rose-600 hover:to-orange-600',
      iconBg: 'text-rose-200',
      subtitleColor: 'text-rose-100',
      valueColor: 'text-white',
    },
    {
      title: 'Profit',
      value: summary?.totalProfit || 0,
      subtitle: 'Revenue minus costs',
      icon: ChartBarIcon,
      href: '/financial/profit',
      gradient: 'from-violet-500 to-purple-600',
      hoverGradient: 'hover:from-violet-600 hover:to-purple-700',
      iconBg: 'text-violet-200',
      subtitleColor: 'text-violet-100',
      valueColor: 'text-white',
    },
    {
      title: 'Salaries',
      value: summary?.totalSalaries || 0,
      subtitle: 'Employee salaries paid',
      icon: UserGroupIcon,
      href: '/financial/salaries',
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
      iconBg: 'text-blue-200',
      subtitleColor: 'text-blue-100',
      valueColor: 'text-white',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 mr-3 text-blue-600" />
            Financial Management
          </h1>
          <p className="mt-1 text-gray-600 font-medium">
            Track revenue, expenses, profits, and salaries
          </p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm h-10">
          <CalendarIcon className="w-4 h-4 text-gray-400 ml-1" />
          <CustomSelect 
            value={month.toString()} 
            onChange={(val) => setMonth(parseInt(val))}
            options={monthNames.map((name, i) => ({ value: (i + 1).toString(), label: name }))}
            className="w-[120px]"
            buttonClassName="border-none focus:ring-0 shadow-none h-8"
          />
          <div className="w-[1px] h-4 bg-gray-200" />
          <CustomSelect 
            value={year.toString()} 
            onChange={(val) => setYear(parseInt(val))}
            options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => ({ value: y.toString(), label: y.toString() }))}
            className="w-[90px]"
            buttonClassName="border-none focus:ring-0 shadow-none h-8"
          />
        </div>
      </div>


      {/* Financial Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => router.push(card.href)}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} ${card.hoverGradient} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left w-full`}
          >
            {/* Background Icon */}
            <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-25 transition-opacity duration-300">
              <card.icon className="w-24 h-24 text-white" />
            </div>

            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{card.title}</h3>
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
      {/* Period Label */}
      <div className="text-center">
        <p className="text-sm text-gray-500 font-medium">
          Showing data for <span className="text-gray-800 font-semibold">{monthNames[month - 1]} {year}</span>
        </p>
      </div>
    </div>
  );
}