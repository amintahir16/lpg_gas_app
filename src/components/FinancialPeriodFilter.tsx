'use client';

import { useMemo } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { CustomSelect } from '@/components/ui/select-custom';
import { Input } from '@/components/ui/input';
import {
  FINANCIAL_MONTH_OPTIONS,
  FINANCIAL_PERIOD_OPTIONS,
  financialYearOptions,
  todayLocalDate,
  type FinancialPeriodMode,
} from '@/lib/financial-period';

export interface FinancialPeriodFilterProps {
  period: FinancialPeriodMode;
  date: string;
  month: number;
  year: number;
  onPeriodChange: (period: FinancialPeriodMode) => void;
  onDateChange: (date: string) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export function FinancialPeriodFilter({
  period,
  date,
  month,
  year,
  onPeriodChange,
  onDateChange,
  onMonthChange,
  onYearChange,
}: FinancialPeriodFilterProps) {
  const yearOptions = useMemo(() => financialYearOptions(5), []);

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm min-h-10">
      <CalendarIcon className="w-4 h-4 text-gray-400 ml-1 shrink-0" />
      <CustomSelect
        value={period}
        onChange={(val) => onPeriodChange(val as FinancialPeriodMode)}
        options={[...FINANCIAL_PERIOD_OPTIONS]}
        className="w-[100px]"
        buttonClassName="border-none focus:ring-0 shadow-none h-8"
      />
      <div className="w-[1px] h-4 bg-gray-200 shrink-0" />

      {period === 'day' && (
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value || todayLocalDate())}
          className="h-8 w-[150px] border-0 shadow-none focus:ring-0 px-1 py-0 text-sm"
        />
      )}

      {period === 'month' && (
        <>
          <CustomSelect
            value={month.toString()}
            onChange={(val) => onMonthChange(parseInt(val, 10))}
            options={FINANCIAL_MONTH_OPTIONS}
            className="w-[120px]"
            buttonClassName="border-none focus:ring-0 shadow-none h-8"
          />
          <div className="w-[1px] h-4 bg-gray-200 shrink-0" />
          <CustomSelect
            value={year.toString()}
            onChange={(val) => onYearChange(parseInt(val, 10))}
            options={yearOptions}
            className="w-[90px]"
            buttonClassName="border-none focus:ring-0 shadow-none h-8"
          />
        </>
      )}

      {period === 'year' && (
        <CustomSelect
          value={year.toString()}
          onChange={(val) => onYearChange(parseInt(val, 10))}
          options={yearOptions}
          className="w-[90px]"
          buttonClassName="border-none focus:ring-0 shadow-none h-8"
        />
      )}
    </div>
  );
}
