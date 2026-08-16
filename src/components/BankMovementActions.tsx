'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/select-custom';
import {
  formatPaymentMethodLabel,
  type PaymentMethodValue,
} from '@/lib/payment-methods';
import { usePaymentWallets } from '@/hooks/usePaymentWallets';
import {
  combineLocalDateAndTime,
  nowLocalTime,
  todayLocalDate,
} from '@/lib/financial-period';

type ModalMode = 'deposit' | 'transfer' | 'withdrawal' | null;

interface BankMovementActionsProps {
  onSaved?: () => void;
  onSuccess?: () => void;
  /**
   * When set (wallet detail page), deposit goes into this bank and
   * transfers/withdrawals always leave from this bank — Bank/From pickers are hidden.
   */
  lockedMethod?: PaymentMethodValue;
  defaultMethod?: PaymentMethodValue;
}

export function BankMovementActions({
  onSaved,
  onSuccess,
  lockedMethod,
  defaultMethod,
}: BankMovementActionsProps) {
  const { options, wallets } = usePaymentWallets();
  const [mode, setMode] = useState<ModalMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLockedMethod = lockedMethod || defaultMethod;
  const walletLocked = Boolean(lockedMethod);
  const walletLabel = activeLockedMethod
    ? formatPaymentMethodLabel(activeLockedMethod, wallets)
    : null;

  const defaultFrom = activeLockedMethod || options[0]?.value || 'CASH';
  const defaultTo = options.find((o) => o.value !== defaultFrom)?.value || options[1]?.value || 'BANK_TRANSFER';

  const transferToOptions = lockedMethod
    ? options.filter((opt) => opt.value !== lockedMethod)
    : [...options];

  const close = () => {
    setMode(null);
    setError(null);
    setSubmitting(false);
  };

  const handleSaved = () => {
    onSaved?.();
    onSuccess?.();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mode) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    const date = String(fd.get('date') || todayLocalDate());
    const time = String(fd.get('time') || nowLocalTime());
    const notes = String(fd.get('notes') || '').trim();
    const movementDate = combineLocalDateAndTime(date, time).toISOString();

    const payload =
      mode === 'deposit'
        ? {
            type: 'DEPOSIT',
            toMethod: lockedMethod || String(fd.get('toMethod')),
            amount,
            date: movementDate,
            notes: notes || null,
          }
        : mode === 'transfer'
          ? {
              type: 'TRANSFER',
              fromMethod: lockedMethod || String(fd.get('fromMethod')),
              toMethod: String(fd.get('toMethod')),
              amount,
              date: movementDate,
              notes: notes || null,
            }
          : {
              type: 'WITHDRAWAL',
              fromMethod: lockedMethod || String(fd.get('fromMethod')),
              amount,
              date: movementDate,
              notes: notes || null,
            };

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/financial/banks/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      close();
      handleSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const depositTitle = walletLocked && walletLabel
    ? `Add Amount to ${walletLabel}`
    : 'Add Amount to Bank';
  const transferTitle = walletLocked && walletLabel
    ? `Move Amount from ${walletLabel}`
    : 'Move Amount Between Banks';
  const withdrawalTitle = walletLocked && walletLabel
    ? `Withdraw from ${walletLabel}`
    : 'Withdraw from Bank';

  const modalSubtitle =
    mode === 'deposit'
      ? walletLocked && walletLabel
        ? `Record an external deposit directly into ${walletLabel}`
        : 'Record an external deposit directly into a selected bank/wallet'
      : mode === 'transfer'
        ? walletLocked && walletLabel
          ? `Transfer funds out of ${walletLabel} into another bank/wallet`
          : 'Move funds internally from one bank/wallet into another'
        : walletLocked && walletLabel
          ? `Record cash/funds leaving ${walletLabel}`
          : 'Record cash/funds leaving a bank/wallet';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setError(null);
            setMode('deposit');
          }}
          className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          + Add Amount
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setMode('transfer');
          }}
          className="h-8 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          Move Amount
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setMode('withdrawal');
          }}
          className="h-8 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          Withdraw
        </Button>
      </div>

      {mode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {mode === 'deposit'
                    ? depositTitle
                    : mode === 'transfer'
                      ? transferTitle
                      : withdrawalTitle}
                </h2>
                <p className="text-[10px] text-gray-500 font-medium">{modalSubtitle}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={close}
                className="h-8 w-8 p-0 rounded-full"
                type="button"
              >
                <span className="text-xl">×</span>
              </Button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              {mode === 'deposit' && !walletLocked && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Bank / Destination Wallet
                  </label>
                  <CustomSelect
                    name="toMethod"
                    defaultValue={defaultFrom}
                    options={[...options]}
                    required
                  />
                </div>
              )}

              {mode === 'transfer' &&
                (walletLocked ? (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                      To
                    </label>
                    <CustomSelect
                      name="toMethod"
                      defaultValue={transferToOptions[0]?.value}
                      options={[...transferToOptions]}
                      required
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                        From
                      </label>
                      <CustomSelect
                        name="fromMethod"
                        defaultValue={defaultFrom}
                        options={[...options]}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                        To
                      </label>
                      <CustomSelect
                        name="toMethod"
                        defaultValue={defaultTo}
                        options={[...options]}
                        required
                      />
                    </div>
                  </div>
                ))}

              {mode === 'withdrawal' && !walletLocked && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    From Wallet
                  </label>
                  <CustomSelect
                    name="fromMethod"
                    defaultValue={defaultFrom}
                    options={[...options]}
                    required
                  />
                </div>
              )}

              {mode === 'withdrawal' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  This amount is withdrawn from the wallet and is not moved to another bank.
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                  Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                  autoFocus
                  className="font-bold text-base h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Date
                  </label>
                  <Input
                    name="date"
                    type="date"
                    defaultValue={todayLocalDate()}
                    required
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Time
                  </label>
                  <Input
                    name="time"
                    type="time"
                    defaultValue={nowLocalTime()}
                    required
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                  Notes / Description
                </label>
                <Input
                  name="notes"
                  placeholder="Optional reference / purpose..."
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={close}
                  disabled={submitting}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Movement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
