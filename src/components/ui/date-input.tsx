'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { InputHTMLAttributes, ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface DateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue'> {
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (e: ChangeEvent<HTMLInputElement> | { target: { name?: string; value: string }; currentTarget: { name?: string; value: string } }) => void;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Converts ISO 'YYYY-MM-DD' to Display 'DD/MM/YYYY'.
 */
function isoToDisplay(iso: string | null | undefined): string {
  if (!iso || typeof iso !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return '';
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

/**
 * Validates day/month/year components and returns 'YYYY-MM-DD' or null if invalid.
 * Handles 2-digit years (e.g. 26 -> 2026).
 */
function validateAndBuildIso(dayStr: string, monthStr: string, yearStr: string): string | null {
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  let year = parseInt(yearStr, 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  // 2-digit year expansion: 26 -> 2026
  if (yearStr.length <= 2) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Robustly parses any user-entered date string into ISO 'YYYY-MM-DD':
 * Supports DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD.MM.YYYY, raw digits (DDMMYYYY, DDMMYY),
 * or partial DD/MM (defaults year to current year).
 */
function parseAnyDateToIso(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.trim();
  if (!cleaned) return null;

  // 1. Standard delimiter match: DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD.MM.YYYY, DD/MM
  const delimMatch = /^(\d{1,2})[/\-. ](\d{1,2})(?:[/\-. ](\d{2,4}))?$/.exec(cleaned);
  if (delimMatch) {
    const dayStr = delimMatch[1];
    const monthStr = delimMatch[2];
    const yearStr = delimMatch[3] || String(new Date().getFullYear());
    return validateAndBuildIso(dayStr, monthStr, yearStr);
  }

  // 2. Raw digits match: DDMMYYYY (8 digits) or DDMMYY (6 digits) or DDMM (4 digits)
  const rawDigits = cleaned.replace(/\D/g, '');
  if (rawDigits.length === 8) {
    return validateAndBuildIso(rawDigits.slice(0, 2), rawDigits.slice(2, 4), rawDigits.slice(4));
  } else if (rawDigits.length === 6) {
    return validateAndBuildIso(rawDigits.slice(0, 2), rawDigits.slice(2, 4), rawDigits.slice(4));
  } else if (rawDigits.length === 4) {
    return validateAndBuildIso(rawDigits.slice(0, 2), rawDigits.slice(2, 4), String(new Date().getFullYear()));
  }

  return null;
}

/**
 * Returns today's ISO string 'YYYY-MM-DD' in local system timezone.
 */
function getLocalTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      value: propValue,
      defaultValue: propDefaultValue,
      onChange,
      name,
      id,
      disabled,
      required,
      placeholder = 'DD/MM/YYYY',
      min,
      max,
      minDate,
      maxDate,
      style,
      ...props
    },
    ref
  ) => {
    const isControlled = propValue !== undefined;
    const initialIso = (isControlled ? propValue : propDefaultValue) || '';
    const [isoValue, setIsoValue] = useState<string>(initialIso || '');
    const [displayText, setDisplayText] = useState<string>(isoToDisplay(initialIso));
    const [isOpen, setIsOpen] = useState(false);

    // Month/Year view state for calendar popover
    const [viewDate, setViewDate] = useState<Date>(() => {
      if (initialIso) {
        const [y, m, d] = initialIso.split('-').map(Number);
        if (y && m && d) return new Date(y, m - 1, d);
      }
      return new Date();
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Forward ref to hidden or text input
    useImperativeHandle(ref, () => hiddenInputRef.current as HTMLInputElement);

    // Keep internal state in sync when controlled propValue changes
    useEffect(() => {
      if (isControlled) {
        const safeIso = propValue || '';
        setIsoValue(safeIso);
        const currentParsed = parseAnyDateToIso(displayText);
        if (currentParsed !== safeIso) {
          setDisplayText(isoToDisplay(safeIso));
        }
        if (safeIso) {
          const [y, m, d] = safeIso.split('-').map(Number);
          if (y && m && d) {
            setViewDate(new Date(y, m - 1, d));
          }
        }
      }
    }, [isControlled, propValue]);

    // Close popover when clicking outside
    useEffect(() => {
      if (!isOpen) return;

      const handlePointerDown = (e: MouseEvent | TouchEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handlePointerDown);
        document.removeEventListener('touchstart', handlePointerDown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, displayText, isoValue]);

    // Emit change to parent
    const emitChange = (newIso: string) => {
      if (onChange) {
        const syntheticEvent = {
          target: { name: name || '', value: newIso },
          currentTarget: { name: name || '', value: newIso }
        };
        onChange(syntheticEvent as any);
      }
    };

    const applyNewIso = (newIso: string) => {
      setIsoValue(newIso);
      setDisplayText(isoToDisplay(newIso));
      emitChange(newIso);
      if (newIso) {
        const [y, m, d] = newIso.split('-').map(Number);
        if (y && m && d) setViewDate(new Date(y, m - 1, d));
      }
    };

    // User typing in text input with auto-formatting slashes after day and month
    const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      const isDeleting = raw.length < displayText.length;

      let adjusted = raw;
      // If user pressed backspace directly on a slash, remove the preceding digit as well
      if (isDeleting && displayText.endsWith('/') && raw === displayText.slice(0, -1)) {
        adjusted = raw.slice(0, -1);
      }

      // Extract up to 8 digits
      const digits = adjusted.replace(/\D/g, '').slice(0, 8);

      if (!digits) {
        setDisplayText('');
        setIsoValue('');
        emitChange('');
        return;
      }

      let formatted = digits;
      if (isDeleting) {
        if (digits.length <= 2) {
          formatted = digits;
        } else if (digits.length <= 4) {
          formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        } else {
          formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        }
      } else {
        // Typing: put slash after 2 digits for day, and after 2 digits for month
        if (digits.length < 2) {
          formatted = digits;
        } else if (digits.length === 2) {
          formatted = `${digits}/`;
        } else if (digits.length < 4) {
          formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        } else if (digits.length === 4) {
          formatted = `${digits.slice(0, 2)}/${digits.slice(2)}/`;
        } else {
          formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        }
      }

      setDisplayText(formatted);

      const parsedIso = parseAnyDateToIso(formatted);
      if (parsedIso) {
        setIsoValue(parsedIso);
        emitChange(parsedIso);
        const [y, m, d] = parsedIso.split('-').map(Number);
        if (y && m && d) setViewDate(new Date(y, m - 1, d));
      }
    };

    const handleBlur = () => {
      const currentText = textInputRef.current?.value ?? displayText;
      const trimmed = currentText.trim();

      if (!trimmed) {
        setDisplayText('');
        setIsoValue('');
        emitChange('');
        return;
      }

      const parsedIso = parseAnyDateToIso(trimmed);
      if (parsedIso) {
        applyNewIso(parsedIso);
      } else {
        // Revert to current valid value only if completely unparseable
        setDisplayText(isoToDisplay(isoValue));
      }
    };

    // Calendar navigation
    const handlePrevMonth = (e: ReactMouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: ReactMouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleSelectDay = (day: number) => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth() + 1;
      const yyyy = String(year).padStart(4, '0');
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const newIso = `${yyyy}-${mm}-${dd}`;

      applyNewIso(newIso);
      setIsOpen(false);
      textInputRef.current?.focus();
    };

    const handleSelectToday = (e: ReactMouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const todayIso = getLocalTodayIso();
      applyNewIso(todayIso);
      setIsOpen(false);
      textInputRef.current?.focus();
    };

    const handleClear = (e: ReactMouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsoValue('');
      setDisplayText('');
      emitChange('');
      setIsOpen(false);
      textInputRef.current?.focus();
    };

    // Calculate calendar grid days
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth(); // 0-indexed
    const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // 0 = Monday
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const todayIso = getLocalTodayIso();
    const effectiveMin = minDate || (typeof min === 'string' ? min : undefined);
    const effectiveMax = maxDate || (typeof max === 'string' ? max : undefined);

    const isDayDisabled = (day: number) => {
      const yyyy = String(currentYear).padStart(4, '0');
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dayIso = `${yyyy}-${mm}-${dd}`;
      if (effectiveMin && dayIso < effectiveMin) return true;
      if (effectiveMax && dayIso > effectiveMax) return true;
      return false;
    };

    // Years range for dropdown
    const startYear = currentYear - 10;
    const yearOptions = Array.from({ length: 21 }, (_, i) => startYear + i);

    return (
      <div ref={containerRef} className="relative inline-block w-full">
        {/* Hidden input for native form submissions, FormData, and ref targeting */}
        <input
          type="hidden"
          ref={hiddenInputRef}
          {...(name ? { name } : {})}
          id={id ? `${id}-hidden` : undefined}
          value={isoValue}
        />

        {/* Visible styled text input with DD/MM/YYYY mask */}
        <div className="relative flex items-center w-full">
          <input
            ref={textInputRef}
            id={id}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            placeholder={placeholder}
            value={displayText}
            required={required && !isoValue}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onFocus={() => {
              // Open calendar on focus for easy date picking
              if (!disabled) setIsOpen(true);
            }}
            className={cn(
              'flex w-full rounded-lg border border-gray-300 bg-white px-3.5 pr-10 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              // Keep height responsive to className or default to standard h-10/h-11
              className?.includes('h-') ? '' : 'h-10',
              className
            )}
            style={{
              color: '#1f2937',
              fontWeight: '500',
              ...style
            }}
            {...props}
          />

          {/* Calendar trigger button */}
          <button
            type="button"
            disabled={disabled}
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                textInputRef.current?.focus();
              }
            }}
            title="Open Calendar (D/M/Y)"
            aria-label="Open Calendar"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors rounded-md hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Custom D/M/Y Calendar Popover */}
        {isOpen && !disabled && (
          <div
            className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl border border-gray-200 shadow-2xl p-3.5 z-[70] animate-in fade-in zoom-in-95 duration-100 select-none"
            role="dialog"
            aria-label="Date Picker (Day/Month/Year)"
          >
            {/* Header: Month & Year controls */}
            <div className="flex items-center justify-between gap-1 mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {/* Month Selector */}
                <select
                  value={currentMonth}
                  onChange={(e) => {
                    const newMonth = Number(e.target.value);
                    setViewDate(new Date(currentYear, newMonth, 1));
                  }}
                  className="!h-7 !py-0 !px-2.5 !text-xs !font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 !rounded-lg focus:outline-none focus:!ring-1 focus:!ring-blue-500 cursor-pointer transition-colors"
                  style={{ height: '28px', minHeight: '28px', maxHeight: '28px', padding: '0 10px', fontSize: '12px', lineHeight: '26px' }}
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>

                {/* Year Selector */}
                <select
                  value={currentYear}
                  onChange={(e) => {
                    const newYear = Number(e.target.value);
                    setViewDate(new Date(newYear, currentMonth, 1));
                  }}
                  className="!h-7 !py-0 !px-2.5 !text-xs !font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 !rounded-lg focus:outline-none focus:!ring-1 focus:!ring-blue-500 cursor-pointer transition-colors"
                  style={{ height: '28px', minHeight: '28px', maxHeight: '28px', padding: '0 10px', fontSize: '12px', lineHeight: '26px' }}
                >
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers: Mo, Tu, We, Th, Fr, Sa, Su */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEK_DAYS.map((wd) => (
                <div key={wd} className="text-[11px] font-semibold text-gray-400 py-0.5">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Padding empty slots before the 1st */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-7 w-7" />
              ))}

              {/* Day cells 1..N */}
              {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dayYyyy = String(currentYear).padStart(4, '0');
                const dayMm = String(currentMonth + 1).padStart(2, '0');
                const dayDd = String(day).padStart(2, '0');
                const cellIso = `${dayYyyy}-${dayMm}-${dayDd}`;

                const isSelected = isoValue === cellIso;
                const isToday = todayIso === cellIso;
                const disabledCell = isDayDisabled(day);

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    disabled={disabledCell}
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      'h-7 w-7 mx-auto rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : isToday
                        ? 'border border-blue-500 text-blue-600 font-semibold hover:bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                      disabledCell && 'opacity-25 cursor-not-allowed hover:bg-transparent text-gray-400'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer buttons */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5"
              >
                Today
              </button>

              <div className="flex items-center gap-2">
                {!required && isoValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="font-medium text-gray-400 hover:text-red-600 px-1 py-0.5"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="font-medium text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
