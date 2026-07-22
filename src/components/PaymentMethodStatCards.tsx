'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  PAYMENT_METHOD_CARD_STYLES,
  PAYMENT_METHOD_OPTIONS,
  emptyPaymentMethodTotals,
  type PaymentMethodValue,
} from '@/lib/payment-methods';

interface PaymentMethodStatCardsProps {
  totals: Record<PaymentMethodValue, number>;
  loading?: boolean;
  formatCurrency: (amount: number) => string;
  /** Optional short hint shown under each amount (e.g. "Collected" / "Net"). */
  subtitle?: string;
  /** When set, cards become clickable (e.g. open bank ledger). */
  onMethodClick?: (method: PaymentMethodValue) => void;
}

export function PaymentMethodStatCards({
  totals,
  loading = false,
  formatCurrency,
  subtitle,
  onMethodClick,
}: PaymentMethodStatCardsProps) {
  const safeTotals = { ...emptyPaymentMethodTotals(), ...totals };
  const clickable = typeof onMethodClick === 'function';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {PAYMENT_METHOD_OPTIONS.map((method) => {
        const styles = PAYMENT_METHOD_CARD_STYLES[method.value];
        const content = (
          <CardContent className="p-4">
            <p className={`text-sm font-medium ${styles.labelTone}`}>{method.label}</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '…' : formatCurrency(safeTotals[method.value] || 0)}
            </p>
            {subtitle ? (
              <p className={`text-xs font-medium mt-0.5 ${styles.labelTone} opacity-90`}>
                {subtitle}
              </p>
            ) : clickable ? (
              <p className={`text-xs font-medium mt-1 ${styles.labelTone} opacity-90`}>
                View all records →
              </p>
            ) : null}
          </CardContent>
        );

        if (clickable) {
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onMethodClick(method.value)}
              className="text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
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
            key={method.value}
            className={`border-0 shadow-sm bg-gradient-to-br ${styles.gradient}`}
          >
            {content}
          </Card>
        );
      })}
    </div>
  );
}
