"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { XMarkIcon, BanknotesIcon, CreditCardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  outstandingBalance: number;
  onPaymentSuccess: () => void;
  invoiceNumber?: string;
  purchaseEntryTotal?: number;
}

export default function VendorPaymentModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  outstandingBalance,
  onPaymentSuccess,
  invoiceNumber,
  purchaseEntryTotal
}: VendorPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const paymentAmount = parseFloat(amount);
    
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    const maxAmount = invoiceNumber && purchaseEntryTotal ? purchaseEntryTotal : Math.abs(outstandingBalance);
    if (paymentAmount > maxAmount) {
      const confirmOverpay = confirm(
        `The payment amount (Rs ${paymentAmount.toLocaleString()}) exceeds the ${invoiceNumber ? 'invoice amount' : 'outstanding balance'} (Rs ${maxAmount.toLocaleString()}).\n\nThis will create a credit balance in your favor. Do you want to proceed?`
      );
      if (!confirmOverpay) return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/vendors/${vendorId}/direct-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentDate,
          method: paymentMethod,
          reference: reference || null,
          description: description || (invoiceNumber ? `Payment for invoice ${invoiceNumber}` : `Payment to ${vendorName}`),
          invoiceNumber: invoiceNumber || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      // Success - reset form and close
      setAmount('');
      setReference('');
      setDescription('');
      onPaymentSuccess();
      onClose();
      
      // Show success notification
      alert(`✅ Payment of Rs ${paymentAmount.toLocaleString()} recorded successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (percentage: number) => {
    // If paying for a specific entry, use entry total; otherwise use outstanding balance
    const baseAmount = purchaseEntryTotal ? purchaseEntryTotal : Math.abs(outstandingBalance);
    const quickAmount = baseAmount * percentage;
    const roundedAmount = Math.round(quickAmount);
    // Cap at the entry total if paying for a specific entry
    const maxAmount = invoiceNumber && purchaseEntryTotal ? Math.round(purchaseEntryTotal) : undefined;
    const finalAmount = maxAmount !== undefined && roundedAmount > maxAmount ? maxAmount : roundedAmount;
    setAmount(finalAmount.toString());
    setError(''); // Clear any previous errors
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-8 pt-8 pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <div className="p-3 bg-green-100 rounded-full">
              <BanknotesIcon className="h-7 w-7 text-green-600" />
            </div>
            Make Payment to Vendor
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base mt-2">
            Record a payment to <span className="font-semibold text-gray-900 bg-blue-100 px-2 py-1 rounded-md">{vendorName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-8">
          {/* Outstanding Balance Display */}
          <div className={`rounded-xl p-6 shadow-sm ${
            outstandingBalance < 0 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
              : 'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <div className={`text-sm font-semibold uppercase tracking-wide ${
                  outstandingBalance < 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {invoiceNumber ? `Invoice ${invoiceNumber} - Amount Due` : 'Outstanding Balance'}
                </div>
                <div className={`text-3xl font-bold mt-2 ${
                  outstandingBalance < 0 ? 'text-red-700' : 'text-black'
                }`}>
                  {formatCurrency(Math.round(invoiceNumber && purchaseEntryTotal ? purchaseEntryTotal : outstandingBalance))}
                </div>
                <div className={`text-xs mt-1 flex items-center gap-1 ${
                  outstandingBalance < 0 ? 'text-red-500' : 'text-black'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    outstandingBalance < 0 ? 'bg-red-400' : 'bg-black'
                  }`}></div>
                  {invoiceNumber 
                    ? `Payment for invoice ${invoiceNumber}`
                    : outstandingBalance < 0 
                      ? 'Vendor owes you this amount' 
                      : 'You owe this amount to the vendor'}
                </div>
              </div>
              <div className={`p-4 rounded-full ${
                outstandingBalance < 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <BanknotesIcon className={`h-8 w-8 ${
                  outstandingBalance < 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Quick Amount Selection
            </label>
            <div className="grid grid-cols-4 gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(0.25)}
                className="h-12 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 font-semibold transition-all duration-200"
              >
                25%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(0.5)}
                className="h-12 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 font-semibold transition-all duration-200"
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(0.75)}
                className="h-12 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 font-semibold transition-all duration-200"
              >
                75%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(1)}
                className="h-12 border-2 border-green-200 hover:border-green-400 hover:bg-green-50 text-green-700 font-semibold transition-all duration-200"
              >
                100%
              </Button>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                Rs
              </span>
              <Input
                id="amount"
                type="number"
                step="1"
                min="0"
                max={invoiceNumber && purchaseEntryTotal ? Math.round(purchaseEntryTotal) : undefined}
                value={amount ? Math.round(parseFloat(amount) || 0).toString() : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === '-') {
                    setAmount(value);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      const roundedValue = Math.round(numValue);
                      // If paying for a specific entry, cap at the entry total
                      const maxAmount = invoiceNumber && purchaseEntryTotal ? Math.round(purchaseEntryTotal) : undefined;
                      if (maxAmount !== undefined && roundedValue > maxAmount) {
                        setAmount(maxAmount.toString());
                        setError(`Payment amount cannot exceed the invoice amount of Rs ${maxAmount.toLocaleString()}`);
                      } else {
                        setAmount(roundedValue.toString());
                        setError(''); // Clear error if within limit
                      }
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !isNaN(parseFloat(value))) {
                    const roundedValue = Math.round(parseFloat(value));
                    const maxAmount = invoiceNumber && purchaseEntryTotal ? Math.round(purchaseEntryTotal) : undefined;
                    if (maxAmount !== undefined && roundedValue > maxAmount) {
                      setAmount(maxAmount.toString());
                      setError(`Payment amount cannot exceed the invoice amount of Rs ${maxAmount.toLocaleString()}`);
                    } else {
                      setAmount(roundedValue.toString());
                      setError('');
                    }
                  }
                }}
                placeholder="0"
                className="pl-12 pr-4 py-4 text-xl font-bold border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                required
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-600 font-medium">Amount Paying:</span>
                  <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(Math.round(parseFloat(amount)))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">Remaining Balance:</span>
                  <span className={`font-bold text-lg ${
                    (invoiceNumber && purchaseEntryTotal ? purchaseEntryTotal : Math.abs(outstandingBalance)) - parseFloat(amount) > 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.round(Math.max(0, (invoiceNumber && purchaseEntryTotal ? purchaseEntryTotal : Math.abs(outstandingBalance)) - parseFloat(amount))))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Payment Date */}
            <div>
              <label htmlFor="paymentDate" className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="py-3 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 font-medium"
                required
              >
                <option value="CASH">💵 Cash</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                <option value="CHECK">📄 Check</option>
                <option value="CREDIT_CARD">💳 Credit Card</option>
                <option value="DEBIT_CARD">💳 Debit Card</option>
              </select>
            </div>
          </div>

          {/* Reference Number - Only show for general payments, not for entry-specific payments */}
          {!invoiceNumber && (
            <div>
              <label htmlFor="reference" className="block text-sm font-semibold text-gray-700 mb-2">
                Reference Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ID, Check #, etc."
                className="py-3 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about this payment..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-4 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold"
            >
              <XMarkIcon className="h-5 w-5 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

