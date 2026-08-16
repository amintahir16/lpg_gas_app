'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomSelect } from '@/components/ui/select-custom';
import {
  BanknotesIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  WALLET_COLOR_PRESETS,
  type BankWalletOption,
  normalizePaymentMethodKey,
} from '@/lib/payment-methods';
import { usePaymentWallets, notifyWalletsUpdated } from '@/hooks/usePaymentWallets';

interface WalletManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const WALLET_TYPES = [
  { value: 'BANK', label: 'Bank Account' },
  { value: 'CASH', label: 'Cash Float' },
  { value: 'MOBILE_WALLET', label: 'Mobile Wallet' },
  { value: 'OTHER', label: 'Other Wallet' },
];

export function WalletManagementModal({
  isOpen,
  onClose,
  onChanged,
}: WalletManagementModalProps) {
  const { wallets, refresh } = usePaymentWallets(true);
  const [editingWallet, setEditingWallet] = useState<BankWalletOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{
    wallet: BankWalletOption;
    message: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('BANK');
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [selectedColorPreset, setSelectedColorPreset] = useState<string>(WALLET_COLOR_PRESETS[1].id);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const openCreateForm = () => {
    setError(null);
    setEditingWallet(null);
    setName('');
    setCode('');
    setType('BANK');
    setBankName('');
    setAccountTitle('');
    setAccountNumber('');
    setSelectedColorPreset(
      WALLET_COLOR_PRESETS[(wallets.length + 1) % WALLET_COLOR_PRESETS.length].id
    );
    setDescription('');
    setIsActive(true);
    setIsCreating(true);
  };

  const openEditForm = (wallet: BankWalletOption) => {
    setError(null);
    setIsCreating(false);
    setEditingWallet(wallet);
    setName(wallet.name);
    setCode(wallet.code);
    setType(wallet.type || 'BANK');
    setBankName(wallet.bankName || '');
    setAccountTitle(wallet.accountTitle || '');
    setAccountNumber(wallet.accountNumber || '');
    const preset = WALLET_COLOR_PRESETS.find((p) => p.gradient === wallet.gradient);
    setSelectedColorPreset(preset ? preset.id : WALLET_COLOR_PRESETS[1].id);
    setDescription(wallet.description || '');
    setIsActive(wallet.isActive ?? true);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingWallet(null);
    setError(null);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (isCreating) {
      const generated = normalizePaymentMethodKey(val);
      setCode(generated || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const preset =
      WALLET_COLOR_PRESETS.find((p) => p.id === selectedColorPreset) ||
      WALLET_COLOR_PRESETS[1];

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      bankName: bankName.trim() || null,
      accountTitle: accountTitle.trim() || null,
      accountNumber: accountNumber.trim() || null,
      gradient: preset.gradient,
      labelTone: preset.labelTone,
      description: description.trim() || null,
      isActive,
    };

    try {
      setSubmitting(true);
      const url = isCreating
        ? '/api/financial/wallets'
        : `/api/financial/wallets/${editingWallet?.id}`;
      const method = isCreating ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save wallet');
      }

      await refresh();
      notifyWalletsUpdated();
      onChanged?.();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save wallet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (wallet: BankWalletOption) => {
    if (!wallet.id) return;
    setError(null);
    setDeleteWarning(null);

    try {
      setSubmitting(true);
      const res = await fetch(`/api/financial/wallets/${wallet.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.hasLinkedTransactions) {
          setDeleteWarning({
            wallet,
            message: data.error,
          });
          return;
        }
        throw new Error(data.error || 'Failed to delete wallet');
      }

      await refresh();
      notifyWalletsUpdated();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wallet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (wallet: BankWalletOption) => {
    if (!wallet.id) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/financial/wallets/${wallet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        setDeleteWarning(null);
        await refresh();
        notifyWalletsUpdated();
        onChanged?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentPreset =
    WALLET_COLOR_PRESETS.find((p) => p.id === selectedColorPreset) ||
    WALLET_COLOR_PRESETS[1];

  const getWalletIcon = (wType?: string) => {
    switch (wType) {
      case 'CASH':
        return <BanknotesIcon className="w-5 h-5" />;
      case 'MOBILE_WALLET':
        return <DevicePhoneMobileIcon className="w-5 h-5" />;
      default:
        return <BuildingLibraryIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BuildingLibraryIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Wallets & Bank Accounts</h2>
              <p className="text-xs text-gray-500 font-medium">
                Manage company-wide payment methods shared across all branches
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-gray-600"
            type="button"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {deleteWarning && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
            <p className="font-bold text-sm mb-1 text-amber-800">Cannot Delete Active Wallet</p>
            <p className="mb-3">{deleteWarning.message}</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleDeactivate(deleteWarning.wallet)}
                disabled={submitting}
              >
                Deactivate & Hide
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setDeleteWarning(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!isCreating && !editingWallet ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Active Wallets ({wallets.length})
              </span>
              <Button
                type="button"
                size="sm"
                onClick={openCreateForm}
                className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add New Wallet
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wallets.map((wallet) => {
                const gradient = wallet.gradient || 'from-indigo-500 to-indigo-600';
                const labelTone = wallet.labelTone || 'text-indigo-100';

                return (
                  <Card
                    key={wallet.id || wallet.code}
                    className={`overflow-hidden border border-gray-100 shadow-sm relative group hover:shadow-md transition-all ${
                      !wallet.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    <div className={`bg-gradient-to-br ${gradient} p-4 text-white relative`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                            {getWalletIcon(wallet.type)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white leading-tight">
                              {wallet.name}
                            </h3>
                            <p className={`text-[10px] font-medium ${labelTone}`}>
                              Code: {wallet.code}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-black/10 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              wallet.isActive ? 'bg-emerald-400' : 'bg-gray-400'
                            }`}
                          />
                          <span className="text-[9px] font-semibold text-white/90">
                            {wallet.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      {wallet.accountNumber && (
                        <div className="mt-3 pt-2 border-t border-white/10 text-[11px] font-mono">
                          {wallet.accountTitle ? `${wallet.accountTitle} · ` : ''}
                          {wallet.accountNumber}
                        </div>
                      )}
                    </div>

                    <CardContent className="p-3 bg-gray-50/50 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {WALLET_TYPES.find((t) => t.value === wallet.type)?.label || wallet.type}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(wallet)}
                          className="h-7 w-7 p-0 text-gray-600 hover:text-blue-600"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(wallet)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                          title="Delete / Deactivate"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {isCreating ? 'Create New Wallet' : `Edit ${editingWallet?.name}`}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeForm}
                className="h-7 text-xs font-semibold"
              >
                Back to list
              </Button>
            </div>

            {/* Live Preview Card */}
            <div className="p-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Live Preview
              </label>
              <div
                className={`rounded-xl bg-gradient-to-br ${currentPreset.gradient} p-4 text-white shadow-md transition-all duration-300`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                      {getWalletIcon(type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">{name || 'Wallet Name'}</h4>
                      <p className={`text-[10px] font-medium ${currentPreset.labelTone}`}>
                        Code: {code || 'WALLET_CODE'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-white/30 text-white bg-white/10 text-[10px]"
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {accountNumber && (
                  <p className="mt-2.5 pt-2 border-t border-white/10 text-xs font-mono">
                    {accountTitle ? `${accountTitle} · ` : ''}
                    {accountNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                  Wallet Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Meezan Bank, SadaPay"
                  required
                  className="h-9 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                  Code / Identifier <span className="text-red-500">*</span>
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MEEZAN_BANK"
                  required
                  disabled={!isCreating}
                  className="h-9 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                  Wallet Category
                </label>
                <CustomSelect
                  value={type}
                  onChange={(val) => setType(val)}
                  options={WALLET_TYPES}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                  Bank / Provider Name (Optional)
                </label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Meezan Bank Ltd"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                  Account Title (Optional)
                </label>
                <Input
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="e.g. Flamora Gas Pvt Ltd"
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                  Account # / IBAN (Optional)
                </label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 0101-0105829101"
                  className="h-9 font-mono"
                />
              </div>
            </div>

            {/* Color Palette Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <SparklesIcon className="w-3.5 h-3.5 text-blue-600" />
                Color Theme Preset
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {WALLET_COLOR_PRESETS.map((preset) => {
                  const isSelected = preset.id === selectedColorPreset;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedColorPreset(preset.id)}
                      className={`h-8 rounded-lg bg-gradient-to-br ${
                        preset.gradient
                      } flex items-center justify-center text-white transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-md'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                      title={preset.name}
                    >
                      {isSelected && <CheckIcon className="w-4 h-4 font-bold" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                Description (Optional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal notes about this account or usage..."
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActiveWallet"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActiveWallet" className="text-xs font-semibold text-gray-700">
                Wallet is Active (available in payment dropdowns)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onClick={closeForm}
                disabled={submitting}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !name.trim() || !code.trim()}
                className="h-9 px-6 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {submitting ? 'Saving...' : isCreating ? 'Create Wallet' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
