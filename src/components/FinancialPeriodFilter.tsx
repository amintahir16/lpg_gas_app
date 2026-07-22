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

  const selectBtn =
    'border-none focus:ring-0 shadow-none h-7 text-xs sm:text-sm pl-1.5 pr-6 sm:pl-2.5 sm:pr-8';

  return (
    <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 bg-white border border-gray-200 rounded-lg h-9 px-1.5 sm:px-2 shadow-sm w-full sm:w-auto max-w-full overflow-hidden">
      <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
      <CustomSelect
        value={period}
        onChange={(val) => onPeriodChange(val as FinancialPeriodMode)}
        options={[...FINANCIAL_PERIOD_OPTIONS]}
        className="w-[72px] sm:w-[100px] shrink-0"
        buttonClassName={selectBtn}
      />
      <div className="w-[1px] h-3.5 bg-gray-200 shrink-0" />

      {period === 'day' && (
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value || todayLocalDate())}
          className="h-7 w-[130px] sm:w-[150px] border-0 shadow-none focus:ring-0 px-1 py-0 text-xs sm:text-sm min-w-0"
        />
      )}

      {period === 'month' && (
        <>
          <CustomSelect
            value={month.toString()}
            onChange={(val) => onMonthChange(parseInt(val, 10))}
            options={FINANCIAL_MONTH_OPTIONS}
            className="w-[78px] sm:w-[120px] shrink-0 min-w-0"
            buttonClassName={selectBtn}
          />
          <div className="w-[1px] h-3.5 bg-gray-200 shrink-0" />
          <CustomSelect
            value={year.toString()}
            onChange={(val) => onYearChange(parseInt(val, 10))}
            options={yearOptions}
            className="w-[64px] sm:w-[90px] shrink-0"
            buttonClassName={selectBtn}
          />
        </>
      )}

      {period === 'year' && (
        <CustomSelect
          value={year.toString()}
          onChange={(val) => onYearChange(parseInt(val, 10))}
          options={yearOptions}
          className="w-[64px] sm:w-[90px] shrink-0"
          buttonClassName={selectBtn}
        />
      )}
    </div>
  );
}
