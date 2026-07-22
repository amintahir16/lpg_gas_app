'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/select-custom';
import {
  PAYMENT_METHOD_OPTIONS,
  formatPaymentMethodLabel,
  type PaymentMethodValue,
} from '@/lib/payment-methods';
import { todayLocalDate } from '@/lib/financial-period';

type ModalMode = 'deposit' | 'transfer' | null;

interface BankMovementActionsProps {
  onSaved: () => void;
  /**
   * When set (wallet detail page), deposit goes into this bank and
   * transfers always leave from this bank — Bank/From pickers are hidden.
   */
  lockedMethod?: PaymentMethodValue;
}

export function BankMovementActions({ onSaved, lockedMethod }: BankMovementActionsProps) {
  const [mode, setMode] = useState<ModalMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletLocked = Boolean(lockedMethod);
  const walletLabel = lockedMethod ? formatPaymentMethodLabel(lockedMethod) : null;

  const transferToOptions = lockedMethod
    ? PAYMENT_METHOD_OPTIONS.filter((opt) => opt.value !== lockedMethod)
    : [...PAYMENT_METHOD_OPTIONS];

  const close = () => {
    setMode(null);
    setError(null);
    setSubmitting(false);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mode) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    const date = String(fd.get('date') || todayLocalDate());
    const notes = String(fd.get('notes') || '').trim();

    const payload =
      mode === 'deposit'
        ? {
            type: 'DEPOSIT',
            toMethod: lockedMethod || String(fd.get('toMethod')),
            amount,
            date,
            notes: notes || null,
          }
        : {
            type: 'TRANSFER',
            fromMethod: lockedMethod || String(fd.get('fromMethod')),
            toMethod: String(fd.get('toMethod')),
            amount,
            date,
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
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const depositTitle = walletLabel ? `Add Amount to ${walletLabel}` : 'Add Amount to Bank';
  const transferTitle = walletLabel
    ? `Move Amount from ${walletLabel}`
    : 'Move Amount Between Banks';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => {
            setError(null);
            setMode('deposit');
          }}
        >
          + Add Amount
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 text-xs font-bold"
          onClick={() => {
            setError(null);
            setMode('transfer');
          }}
        >
          Move Amount
        </Button>
      </div>

      {mode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {mode === 'deposit' ? depositTitle : transferTitle}
                </h2>
                <p className="text-[10px] text-gray-500 font-medium">
                  {mode === 'deposit'
                    ? walletLocked
                      ? `Deposit money directly into ${walletLabel}`
                      : 'Deposit money directly into a payment method wallet'
                    : walletLocked
                      ? `Transfer funds out of ${walletLabel} to another wallet`
                      : 'Transfer balance from one bank wallet to another'}
                </p>
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
                    Bank
                  </label>
                  <CustomSelect
                    name="toMethod"
                    defaultValue="CASH"
                    options={[...PAYMENT_METHOD_OPTIONS]}
                    required
                  />
                </div>
              )}

              {mode === 'transfer' && (
                walletLocked ? (
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
                        defaultValue="CASH"
                        options={[...PAYMENT_METHOD_OPTIONS]}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                        To
                      </label>
                      <CustomSelect
                        name="toMethod"
                        defaultValue="BANK_TRANSFER"
                        options={[...PAYMENT_METHOD_OPTIONS]}
                        required
                      />
                    </div>
                  </div>
                )
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                  Amount (PKR)
                </label>
                <Input
                  name="amount"
                  type="number"
                  placeholder="Enter amount"
                  step="1"
                  min="1"
                  required
                  className="h-9 font-bold text-emerald-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                  Date
                </label>
                <Input
                  name="date"
                  type="date"
                  defaultValue={todayLocalDate()}
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                  Notes (optional)
                </label>
                <Input
                  name="notes"
                  type="text"
                  placeholder={
                    mode === 'deposit'
                      ? 'e.g., Opening cash float'
                      : 'e.g., Moved to Jazz Cash'
                  }
                  className="h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={close}
                  className="h-9 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-6 text-xs font-bold shadow-md shadow-emerald-200"
                >
                  {submitting
                    ? 'Saving...'
                    : mode === 'deposit'
                      ? 'Add Amount'
                      : 'Move Amount'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
