'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_WALLETS,
  type BankWalletOption,
  formatPaymentMethodLabel as formatLabelHelper,
  getWalletStyle as getStyleHelper,
} from '@/lib/payment-methods';

let cachedActiveWallets: BankWalletOption[] | null = null;

export function notifyWalletsUpdated() {
  cachedActiveWallets = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallets-updated'));
  }
}

export function usePaymentWallets(includeInactive = false) {
  const [wallets, setWallets] = useState<BankWalletOption[]>(() => {
    if (!includeInactive && cachedActiveWallets && cachedActiveWallets.length > 0) {
      return cachedActiveWallets;
    }
    return DEFAULT_WALLETS;
  });
  const [loading, setLoading] = useState(!cachedActiveWallets);

  const refresh = useCallback(async () => {
    try {
      const url = includeInactive
        ? '/api/financial/wallets?includeInactive=true'
        : '/api/financial/wallets';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.wallets) && data.wallets.length > 0) {
          if (!includeInactive) {
            cachedActiveWallets = data.wallets;
          }
          setWallets(data.wallets);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch wallets:', err);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    // Initial fetch on mount
    refresh();

    // Listen for cross-component wallet updates (e.g. rename, add, delete)
    const handleUpdate = () => {
      refresh();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('wallets-updated', handleUpdate);
      return () => {
        window.removeEventListener('wallets-updated', handleUpdate);
      };
    }
  }, [refresh]);

  const formatLabel = useCallback(
    (code: string | null | undefined) => formatLabelHelper(code, wallets),
    [wallets]
  );

  const getStyle = useCallback(
    (code: string | null | undefined) => {
      const w = wallets.find((item) => item.code === code);
      return getStyleHelper(code, w);
    },
    [wallets]
  );

  const options = wallets.map((w) => ({
    value: w.code,
    label: w.name,
  }));

  return {
    wallets,
    options,
    loading,
    refresh,
    formatLabel,
    getStyle,
  };
}
