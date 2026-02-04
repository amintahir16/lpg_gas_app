'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { B2CTransactionModal } from '@/components/B2CTransactionModal';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';
import {
  ArrowLeftIcon,
  HomeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  CalendarIcon,
  EyeIcon,
  FunnelIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Interfaces based on API response
interface B2CCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  houseNumber: string | null;
  sector: string | null;
  street: string | null;
  phase: string | null;
  area: string | null;
  city: string;
  totalProfit: number;
  isActive: boolean;
  createdAt: string;
  marginCategory?: {
    id: string;
    name: string;
    marginPerKg: number;
  };
  cylinderHoldings: {
    id: string;
    cylinderType: string;
    quantity: number;
    securityAmount: number;
    issueDate: string;
    isReturned: boolean;
  }[];
}

interface B2CTransaction {
  id: string;
  billSno: string;
  date: string;
  time: string;
  totalAmount: number; // For B2C, usually assumes fully paid
  paidAmount?: number;
  deliveryCharges: number;
  finalAmount: number;
  actualProfit: number;
  paymentMethod: string;
  notes?: string;
  paymentReference?: string;
  gasItems: {
    cylinderType: string;
    quantity: number;
    pricePerItem: number;
    totalPrice: number;
  }[];
  securityItems: {
    cylinderType: string;
    quantity: number;
    pricePerItem: number;
    totalPrice: number;
    isReturn: boolean;
  }[];
  accessoryItems: {
    productName: string;
    quantity: number;
    pricePerItem: number;
    totalPrice: number;
  }[];
  voided: boolean;
  voidReason?: string;
}

interface CustomerLedgerResponse {
  customer: B2CCustomer;
  transactions: B2CTransaction[];
  summary: {
    netBalance: number;
    totalTransactions: number;
    totalIn: number;
    totalOut: number;
    totalProfit: number;
    totalSecurityHeld: number;
    cylinderHoldingsCount: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function B2CCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<B2CCustomer | null>(null);
  const [transactions, setTransactions] = useState<B2CTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CustomerLedgerResponse['summary'] | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Date filter states
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Report states
  const [reportDateFilter, setReportDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showReportDateFilter, setShowReportDateFilter] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Transaction modal state
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Transaction detail modal states
  const [selectedTransaction, setSelectedTransaction] = useState<B2CTransaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [undoingTransaction, setUndoingTransaction] = useState(false);

  // Dynamic cylinder types (cache)
  const [inventoryCylinderTypes, setInventoryCylinderTypes] = useState<any[]>([]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerLedger();
    }
  }, [customerId, pagination.page, dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    fetchCylinderTypes();
  }, []);

  // Close date filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDateFilter && !target.closest('.date-filter-container')) {
        setShowDateFilter(false);
      }
      if (showReportDateFilter && !target.closest('.report-date-filter-container')) {
        setShowReportDateFilter(false);
      }
    };

    if (showDateFilter || showReportDateFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDateFilter, showReportDateFilter]);

  const fetchCustomerLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);

      const response = await fetch(`/api/customers/b2c/${customerId}/ledger?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customer ledger');
      }

      const data: CustomerLedgerResponse = await response.json();
      setCustomer(data.customer);
      setTransactions(data.transactions);
      setSummary(data.summary);
      setPagination(data.pagination);

    } catch (err) {
      console.error('Error fetching ledger:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCylinderTypes = async () => {
    try {
      const response = await fetch('/api/inventory/cylinder-types');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.types) {
          setInventoryCylinderTypes(data.types);
        }
      }
    } catch (error) {
      console.error('Error fetching cylinder types:', error);
    }
  };

  const handleTransactionCreated = () => {
    setShowTransactionModal(false);
    fetchCustomerLedger();
  };

  const handleDownloadReport = async () => {
    if (!customer) return;

    setDownloadingReport(true);
    try {
      const params = new URLSearchParams();
      if (reportDateFilter.startDate) params.append('startDate', reportDateFilter.startDate);
      if (reportDateFilter.endDate) params.append('endDate', reportDateFilter.endDate);

      const response = await fetch(`/api/customers/b2c/${customerId}/report?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `B2C-Transaction-Report-${customer.name}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowReportDateFilter(false);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download transaction report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-PK');
  const formatTime = (timeString: string) => new Date(timeString).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const getCylinderTypeDisplay = (type: string | null) => {
    if (!type) return 'N/A';
    if (inventoryCylinderTypes.length > 0) {
      const dynamicType = inventoryCylinderTypes.find(t => t.cylinderType === type);
      if (dynamicType) return dynamicType.label;
    }
    return getCylinderTypeDisplayName(type);
  };

  const formatAddress = (c: B2CCustomer) => {
    const parts = [];
    if (c.houseNumber) parts.push(`H.No: ${c.houseNumber}`);
    if (c.sector) parts.push(`Sector: ${c.sector}`);
    if (c.street) parts.push(`St: ${c.street}`);
    if (c.phase) parts.push(`Ph: ${c.phase}`);
    if (c.area) parts.push(c.area);
    return parts.join(', ') || c.address;
  };

  if (loading && !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Customer not found</p>
          <Button onClick={() => router.push('/customers/b2c')} className="mt-4">
            Back to B2C Customers
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
          onClick={() => router.push('/customers/b2c')}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to B2C Customers
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HomeIcon className="w-8 h-8 mr-3 text-green-600" />
            {customer.name}
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Customer Profile & Transaction History
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-0 shadow-sm bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Info & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Customer Information (Left) */}
        <Card className="lg:col-span-2 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-base font-semibold text-gray-900">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500">Phone</p>
                <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400" /> {customer.phone}
                </p>
              </div>
              {customer.email && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Email</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" /> {customer.email}
                  </p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500">Address</p>
                <div className="flex items-start gap-2">
                  <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-base font-semibold text-gray-900">{formatAddress(customer)}</p>
                    <p className="text-sm text-gray-600">{customer.city}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Status</p>
                <Badge variant={customer.isActive ? 'success' : 'destructive'} className="mt-1 h-5 text-xs">
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Margin Category</p>
                <p className="text-base font-semibold text-gray-900">
                  {customer.marginCategory ? `${customer.marginCategory.name} (Rs ${customer.marginCategory.marginPerKg}/kg)` : 'Standard'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Summary (Right) */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm h-full">
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-base font-semibold text-gray-900">Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">

            {/* Total Transactions (Replaces Net Balance) */}
            <div className="text-center py-1">
              <p className="text-xs font-medium text-gray-500">Total Transactions</p>
              <div className="flex flex-col items-center justify-center">
                <p className="text-3xl font-bold flex items-center justify-center text-indigo-600">
                  {summary?.totalTransactions || 0}
                </p>
                <p className="text-[10px] text-gray-500">
                  Lifetime Activity
                </p>
              </div>
            </div>

            {/* Financial Stats */}
            {summary && (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">Total Sales</span>
                  <span className="text-sm font-bold text-gray-800">
                    {formatCurrency(summary.totalOut)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-green-600">Total Profit</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(summary.totalProfit)}
                  </span>
                </div>
              </div>
            )}

            {/* Security Holdings */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Security Holdings</p>
              {customer?.cylinderHoldings && customer.cylinderHoldings.filter(h => !h.isReturned).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(
                    customer.cylinderHoldings
                      .filter(h => !h.isReturned)
                      .reduce((acc, h) => {
                        const type = h.cylinderType;
                        if (!acc[type]) {
                          acc[type] = { quantity: 0, amount: 0 };
                        }
                        acc[type].quantity += h.quantity;
                        acc[type].amount += (Number(h.securityAmount) * h.quantity);
                        return acc;
                      }, {} as Record<string, { quantity: number; amount: number }>)
                  ).map(([type, data], index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-xs text-blue-700 font-medium">
                        {getCylinderTypeDisplay(type)} <span className="text-[10px] text-blue-500">x{data.quantity}</span>
                      </span>
                      <span className="text-xs font-bold text-blue-800">
                        {formatCurrency(data.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 mt-1 border-t border-dashed border-gray-200">
                    <span className="text-[10px] font-semibold text-gray-500">Total</span>
                    <span className="text-xs font-bold text-gray-700">
                      {formatCurrency(summary?.totalSecurityHeld || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">No active security items</div>
              )}
            </div>

            {/* New Transaction Button */}
            <div className="space-y-2 pt-1">
              <Button
                size="sm"
                onClick={() => setShowTransactionModal(true)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md h-9"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Ledger Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Transaction Ledger</CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Complete transaction history
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Filter */}
              <div className="relative date-filter-container">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {(dateFilter.startDate || dateFilter.endDate) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {(dateFilter.startDate && dateFilter.endDate) ? '2' : '1'}
                    </span>
                  )}
                </Button>
                {showDateFilter && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 date-filter-container">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" /> Filter by Date Range
                      </h3>
                      <button onClick={() => setShowDateFilter(false)}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="space-y-3">
                      <div><label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label><Input type="date" value={dateFilter.startDate} onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })} className="text-sm" /></div>
                      <div><label className="block text-xs font-medium text-gray-700 mb-1">End Date</label><Input type="date" value={dateFilter.endDate} onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })} className="text-sm" /></div>
                      <div className="flex gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setDateFilter({ startDate: '', endDate: '' })} className="flex-1 text-xs">Clear</Button><Button size="sm" onClick={() => setShowDateFilter(false)} className="flex-1 text-xs">Apply</Button></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Report Button */}
              <div className="relative report-date-filter-container">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReportDateFilter(!showReportDateFilter)}
                  disabled={downloadingReport}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Trans Report</span>
                  {downloadingReport && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 ml-1"></div>}
                </Button>
                {showReportDateFilter && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 report-date-filter-container">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Report Range</h3>
                      <button onClick={() => setShowReportDateFilter(false)}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    <div className="space-y-3">
                      <div><label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label><Input type="date" value={reportDateFilter.startDate} onChange={(e) => setReportDateFilter({ ...reportDateFilter, startDate: e.target.value })} className="text-sm" /></div>
                      <div><label className="block text-xs font-medium text-gray-700 mb-1">End Date</label><Input type="date" value={reportDateFilter.endDate} onChange={(e) => setReportDateFilter({ ...reportDateFilter, endDate: e.target.value })} className="text-sm" /></div>
                      <div className="flex gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setReportDateFilter({ startDate: '', endDate: '' })} className="flex-1 text-xs">Clear</Button><Button size="sm" onClick={handleDownloadReport} className="flex-1 text-xs">Download</Button></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bill No</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Transaction Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => {
                  // Infer detailed transaction type
                  const hasGasSale = tx.gasItems.length > 0;
                  const hasAccessorySale = tx.accessoryItems.length > 0;
                  const hasDeposit = tx.securityItems.some(s => !s.isReturn);
                  const hasReturn = tx.securityItems.some(s => s.isReturn);

                  const parts = [];
                  if (hasGasSale || hasAccessorySale) parts.push('Sale');
                  if (hasDeposit) parts.push('Deposit');
                  if (hasReturn) parts.push('Return');

                  return (
                    <tr key={tx.id} className={tx.voided ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(tx.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatTime(tx.time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{tx.billSno}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {tx.voided ? (
                            <Badge variant="destructive">VOIDED</Badge>
                          ) : (
                            parts.map((type, idx) => {
                              let variant = 'default';
                              if (type === 'Sale') variant = 'success';
                              else if (type === 'Deposit') variant = 'info';
                              else if (type === 'Return') variant = 'warning';

                              return (
                                <Badge key={idx} variant={variant as any}>
                                  {type}
                                </Badge>
                              );
                            })
                          )}
                          {!tx.voided && parts.length === 0 && (
                            <Badge variant="secondary">Transaction</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="max-w-xs space-y-1">
                          {/* Sold Section (Gas + Accessories) */}
                          {(tx.gasItems.length > 0 || tx.accessoryItems.length > 0) && (
                            <div>
                              <span className="text-xs font-semibold text-green-700 bg-green-50 px-1 rounded mr-1">Sold:</span>
                              <span className="text-xs text-gray-700">
                                {[
                                  ...tx.gasItems.map(item => `${getCylinderTypeDisplay(item.cylinderType)} x${item.quantity}`),
                                  ...tx.accessoryItems.map(item => `${item.productName} x${item.quantity}`)
                                ].join(', ')}
                              </span>
                            </div>
                          )}

                          {/* Returned Section (Security Returns) */}
                          {tx.securityItems.some(s => s.isReturn) && (
                            <div>
                              <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-1 rounded mr-1">Returned:</span>
                              <span className="text-xs text-gray-700">
                                {tx.securityItems
                                  .filter(s => s.isReturn)
                                  .map(item => `${getCylinderTypeDisplay(item.cylinderType)} x${item.quantity}`)
                                  .join(', ')}
                              </span>
                            </div>
                          )}

                          {/* Deposit Section (Security Taken) */}
                          {tx.securityItems.some(s => !s.isReturn) && (
                            <div>
                              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-1 rounded mr-1">Deposit:</span>
                              <span className="text-xs text-gray-700">
                                {tx.securityItems
                                  .filter(s => !s.isReturn)
                                  .map(item => `${getCylinderTypeDisplay(item.cylinderType)} x${item.quantity}`)
                                  .join(', ')}
                              </span>
                            </div>
                          )}

                          {/* Delivery Charges */}
                          {tx.deliveryCharges > 0 && (
                            <div className="text-xs text-gray-500 italic mt-1">
                              Delivery: {formatCurrency(tx.deliveryCharges)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(tx.finalAmount)}
                        <div className="text-xs font-normal text-green-600 mt-1">{tx.paymentMethod}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {/* Show profit for this transaction if available */}
                        {tx.actualProfit > 0 ? formatCurrency(tx.actualProfit) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(tx);
                            setShowTransactionDetail(true);
                          }}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page === pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Transaction Modal */}
      {showTransactionModal && (
        <B2CTransactionModal
          customerId={customer.id}
          customerName={customer.name}
          customer={customer}
          onClose={() => setShowTransactionModal(false)}
          onSuccess={handleTransactionCreated}
        />
      )}

      {/* Transaction Detail Modal */}
      {showTransactionDetail && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-5xl shadow-lg rounded-md bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details - {selectedTransaction.billSno}</h3>
                {selectedTransaction.voided && <span className="text-red-600 font-bold bg-red-50 text-xs px-2 py-1 rounded">VOIDED</span>}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/customers/b2c/transactions/${selectedTransaction.id}/report`);
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Transaction-${selectedTransaction.billSno}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } else {
                        alert('Failed to download receipt');
                      }
                    } catch (err) { console.error(err); alert('Error downloading'); }
                  }}
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1" /> Receipt
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedTransaction.voided || undoingTransaction}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  onClick={async () => {
                    if (!confirm('Are you sure you want to VOID this transaction? This will reverse all stock and accounting entries.')) return;
                    const reason = prompt('Reason for voiding (optional):');
                    try {
                      setUndoingTransaction(true);
                      const res = await fetch(`/api/customers/b2c/transactions/${selectedTransaction.id}/undo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason })
                      });
                      if (res.ok) {
                        alert('Transaction voided successfully');
                        setShowTransactionDetail(false);
                        fetchCustomerLedger();
                      } else {
                        const err = await res.json();
                        alert('Failed: ' + err.error);
                      }
                    } catch (e) { alert('Error voiding transaction'); }
                    finally { setUndoingTransaction(false); }
                  }}
                >
                  <ArrowPathIcon className="w-4 h-4 mr-1" /> {undoingTransaction ? 'Voiding...' : 'Inverse/Void'}
                </Button>

                <Button variant="ghost" size="sm" onClick={() => setShowTransactionDetail(false)}>
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Info Grid */}
              {/* Info Grid */}
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Transaction Type</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(selectedTransaction.gasItems.length > 0 || selectedTransaction.accessoryItems.length > 0) && (
                        <Badge variant="success">SALE</Badge>
                      )}
                      {selectedTransaction.securityItems.some(item => !item.isReturn) && (
                        <Badge variant="info">DEPOSIT</Badge>
                      )}
                      {selectedTransaction.securityItems.some(item => item.isReturn) && (
                        <Badge variant="warning">RETURN</Badge>
                      )}
                      {selectedTransaction.gasItems.length === 0 &&
                        selectedTransaction.accessoryItems.length === 0 &&
                        selectedTransaction.securityItems.length === 0 && (
                          <Badge variant="secondary">TRANSACTION</Badge>
                        )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(selectedTransaction.date)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-semibold text-gray-900">{formatTime(selectedTransaction.time)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(selectedTransaction.finalAmount)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-semibold text-gray-900">
                      {selectedTransaction.paymentMethod ? selectedTransaction.paymentMethod.replace(/_/g, ' ') : '-'}
                    </p>
                  </div>

                  {selectedTransaction.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="font-semibold text-gray-900">{selectedTransaction.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction Items */}
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Transaction Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Items Table - Grouped by Category */}
                  <div className="space-y-4">
                    {/* Sold Items Table */}
                    {(selectedTransaction.gasItems.length > 0 || selectedTransaction.accessoryItems.length > 0) && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="success" className="text-xs">SOLD</Badge>
                          <span className="text-sm font-medium text-gray-700">
                            {selectedTransaction.gasItems.length + selectedTransaction.accessoryItems.length} item(s)
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-green-200 rounded-lg">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-green-50">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Item</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Qty</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Price/Unit</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-green-700 uppercase">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Combine gas and accessory items for display */}
                              {[
                                ...selectedTransaction.gasItems.map(item => ({ ...item, type: 'GAS' })),
                                ...selectedTransaction.accessoryItems.map(item => ({ ...item, type: 'ACCESSORY' }))
                              ].map((item: any, index) => (
                                <tr key={`sold-${index}`} className="border-t border-green-100">
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.type === 'GAS' ? getCylinderTypeDisplay(item.cylinderType) : item.productName}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{Number(item.quantity)}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {formatCurrency(item.quantity > 0 ? Number(item.totalPrice) / Number(item.quantity) : 0)}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(Number(item.totalPrice))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Returned Items Table (Security Return) */}
                    {selectedTransaction.securityItems.some(item => item.isReturn) && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="warning" className="text-xs">RETURNED</Badge>
                          <span className="text-sm font-medium text-gray-700">
                            {selectedTransaction.securityItems.filter(item => item.isReturn).length} item(s)
                          </span>
                          <span className="text-sm text-orange-600">(Security Returned)</span>
                        </div>
                        <div className="overflow-x-auto border border-orange-200 rounded-lg">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-orange-50">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Item</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Qty</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Refund/Unit</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Total Refund</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedTransaction.securityItems.filter(item => item.isReturn).map((item, index) => (
                                <tr key={`return-${index}`} className="border-t border-orange-100">
                                  <td className="px-4 py-2 text-sm text-gray-900">{getCylinderTypeDisplay(item.cylinderType)}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{Number(item.quantity)}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {formatCurrency(item.quantity > 0 ? Number(item.totalPrice) / Number(item.quantity) : 0)}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(Number(item.totalPrice))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Deposit Items Table (Security Taken) */}
                    {selectedTransaction.securityItems.some(item => !item.isReturn) && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="info" className="text-xs">DEPOSIT</Badge>
                          <span className="text-sm font-medium text-gray-700">
                            {selectedTransaction.securityItems.filter(item => !item.isReturn).length} item(s)
                          </span>
                          <span className="text-sm text-blue-600">(Security Taken)</span>
                        </div>
                        <div className="overflow-x-auto border border-blue-200 rounded-lg">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-blue-50">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Item</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Qty</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Deposit/Unit</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Total Deposit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedTransaction.securityItems.filter(item => !item.isReturn).map((item, index) => (
                                <tr key={`deposit-${index}`} className="border-t border-blue-100">
                                  <td className="px-4 py-2 text-sm text-gray-900">{getCylinderTypeDisplay(item.cylinderType)}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{Number(item.quantity)}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {formatCurrency(item.quantity > 0 ? Number(item.totalPrice) / Number(item.quantity) : 0)}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(Number(item.totalPrice))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {selectedTransaction.deliveryCharges > 0 && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded font-semibold border border-gray-200">
                        <span className="text-gray-900">Delivery Charges</span>
                        <span className="text-gray-900">{formatCurrency(selectedTransaction.deliveryCharges)}</span>
                      </div>
                    )}

                    <div className="border-t-2 border-gray-300 pt-3 mt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-gray-900">Net Transaction Amount:</span>
                        <span className="text-gray-900">{formatCurrency(selectedTransaction.finalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
