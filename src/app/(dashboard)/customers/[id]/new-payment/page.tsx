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
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
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
      const transactionData = {
        transactionType: 'PAYMENT',
        customerId,
        date: paymentData.date,
        time: paymentData.time,
        totalAmount: parseFloat(paymentData.amount),
        paymentReference: paymentData.paymentReference,
        notes: paymentData.notes || 'Payment received',
        items: [{
          productId: null,
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

      // Show success message
      alert('Payment recorded successfully!');
      
      // Redirect to customer detail page
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
          <CardTitle className="text-lg font-semibold text-gray-900">New Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <Input
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time
                </label>
                <Input
                  type="time"
                  value={paymentData.time}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Payment Reference */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Reference
              </label>
              <Input
                type="text"
                value={paymentData.paymentReference}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentReference: e.target.value }))}
                placeholder="Payment Reference"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <Input
                type="text"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes"
              />
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount (PKR)
              </label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter payment amount"
                step="0.01"
                min="0.01"
                required
                className="text-lg"
              />
            </div>

            {/* Payment Amount Display */}
            <div className="text-right">
              <span className="text-lg font-semibold text-blue-600">
                Payment Amount: Rs {paymentData.amount || '0'}
              </span>
            </div>

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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4"
              >
                {saving ? 'Creating Transaction...' : 'Create Transaction'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
