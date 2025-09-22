'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeftIcon,
  CreditCardIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string | null;
  ledgerBalance: number;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentReference: '',
    notes: '',
    paymentMethod: 'CASH',
  });

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const now = new Date();
      const billSno = `BILL-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;

      const transactionData = {
        transactionType: 'PAYMENT',
        billSno,
        customerId,
        date: now.toISOString().split('T')[0],
        time: now.toISOString(),
        totalAmount: parseFloat(paymentData.amount),
        paymentReference: paymentData.paymentReference,
        notes: paymentData.notes || 'Payment received',
        items: [{
          productName: 'Payment',
          quantity: 1,
          pricePerItem: parseFloat(paymentData.amount),
          totalPrice: parseFloat(paymentData.amount),
        }],
      };

      const response = await fetch('/api/b2b-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      router.push(`/customers/${customerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading payment form...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Customer not found</p>
          <Button 
            onClick={() => router.push('/customers')}
            className="mt-4"
          >
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/customers/${customerId}`)}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Customer
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Payment</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Record a payment received from {customer.name}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Person</p>
              <p className="text-lg font-semibold text-gray-900">{customer.contactPerson}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Ledger Balance</p>
              <p className={`text-lg font-semibold ${
                customer.ledgerBalance > 0 ? 'text-red-600' : 
                customer.ledgerBalance < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {formatCurrency(customer.ledgerBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-lg font-semibold text-gray-900">{customer.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-0 shadow-sm bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-red-700 font-medium">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Payment Details</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Enter the payment amount and reference information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Amount (PKR) *
                </label>
                <Input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Reference
                </label>
                <Input
                  type="text"
                  value={paymentData.paymentReference}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, paymentReference: e.target.value }))}
                  placeholder="e.g., BANK-001, CHECK-123"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHECK">Check</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <Textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this payment"
                  rows={3}
                />
              </div>
            </div>

            {/* Payment Summary */}
            {paymentData.amount && (
              <Card className="border border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payment Amount</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(parseFloat(paymentData.amount) || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">New Ledger Balance</p>
                      <p className={`text-2xl font-bold ${
                        (customer.ledgerBalance - (parseFloat(paymentData.amount) || 0)) > 0 ? 'text-red-600' : 
                        (customer.ledgerBalance - (parseFloat(paymentData.amount) || 0)) < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {formatCurrency(customer.ledgerBalance - (parseFloat(paymentData.amount) || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/customers/${customerId}`)}
                className="font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Recording Payment...
                  </div>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
