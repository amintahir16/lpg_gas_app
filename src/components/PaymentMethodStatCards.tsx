'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  getWalletStyle,
  emptyPaymentMethodTotals,
  type BankWalletOption,
} from '@/lib/payment-methods';
import { usePaymentWallets } from '@/hooks/usePaymentWallets';

interface PaymentMethodStatCardsProps {
  totals: Record<string, number>;
  wallets?: BankWalletOption[];
  loading?: boolean;
  formatCurrency: (amount: number) => string;
  /** Optional short hint shown under each amount (e.g. "Collected" / "Net"). */
  subtitle?: string;
  /** When set, cards become clickable (e.g. open bank ledger). */
  onMethodClick?: (method: string) => void;
}

export function PaymentMethodStatCards({
  totals,
  wallets: propWallets,
  loading = false,
  formatCurrency,
  subtitle,
  onMethodClick,
}: PaymentMethodStatCardsProps) {
  const { wallets: hookWallets } = usePaymentWallets();
  const wallets = (propWallets && propWallets.length > 0) ? propWallets : hookWallets;
  const safeTotals = { ...emptyPaymentMethodTotals(), ...totals };
  const clickable = typeof onMethodClick === 'function';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {wallets.map((wallet) => {
        const styles = getWalletStyle(wallet.code, wallet);
        const amount = safeTotals[wallet.code] !== undefined
          ? safeTotals[wallet.code]
          : safeTotals[wallet.name.toUpperCase().replace(/\s+/g, '_')] || 0;

        const content = (
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${styles.labelTone}`}>{wallet.name}</p>
              {wallet.accountNumber && (
                <span className={`text-[10px] font-mono opacity-80 ${styles.labelTone}`}>
                  {wallet.accountNumber}
                </span>
              )}
            </div>
            {loading ? (
              <div className="h-7 w-32 bg-white/30 rounded-md animate-pulse my-1" />
            ) : (
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(amount)}
              </p>
            )}
            {subtitle ? (
              <p className={`text-xs font-medium mt-0.5 ${styles.labelTone} opacity-90`}>
                {subtitle}
              </p>
            ) : clickable ? (
              <p className={`text-xs font-medium mt-1 ${styles.labelTone} opacity-90 flex items-center justify-between`}>
                <span>View all records</span>
                <span>→</span>
              </p>
            ) : null}
          </CardContent>
        );

        if (clickable) {
          return (
            <button
              key={wallet.id || wallet.code}
              type="button"
              onClick={() => onMethodClick(wallet.code)}
              className="text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 w-full"
            >
              <Card
                className={`border-0 shadow-sm bg-gradient-to-br ${styles.gradient} transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer h-full`}
              >
                {content}
              </Card>
            </button>
          );
        }

        return (
          <Card
            key={wallet.id || wallet.code}
            className={`border-0 shadow-sm bg-gradient-to-br ${styles.gradient}`}
          >
            {content}
          </Card>
        );
      })}
    </div>
  );
}
