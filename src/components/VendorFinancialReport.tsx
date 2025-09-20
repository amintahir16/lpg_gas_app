'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  category: string;
}

interface FinancialReport {
  vendor: Vendor;
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    previousBalance: number;
    cashIn: number;
    cashOut: number;
    netBalance: number;
  };
  transactions: {
    purchases: any[];
    payments: any[];
  };
  totalTransactions: number;
}

interface VendorFinancialReportProps {
  vendorId?: string;
  vendorName?: string;
}

export default function VendorFinancialReport({ 
  vendorId, 
  vendorName = "Vendor Financial Report" 
}: VendorFinancialReportProps) {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState(vendorId || '');

  useEffect(() => {
    if (vendorId) {
      setSelectedVendorId(vendorId);
    }
    fetchVendors();
  }, [vendorId]);

  useEffect(() => {
    if (selectedVendorId) {
      fetchFinancialReport();
    }
  }, [selectedVendorId, period, startDate, endDate]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchFinancialReport = async () => {
    if (!selectedVendorId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        vendorId: selectedVendorId,
        period
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/vendors/reports/financial?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial report');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial report');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    return balance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getBalanceIcon = (balance: number) => {
    return balance >= 0 ? TrendingUp : TrendingDown;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{vendorName}</h2>
            <p className="text-gray-600">Financial report and transaction history</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchFinancialReport}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor
            </label>
            <Select
              value={selectedVendorId}
              onValueChange={setSelectedVendorId}
              disabled={!!vendorId}
            >
              <option value="">Select a vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.companyName} ({vendor.vendorCode})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period
            </label>
            <Select value={period} onValueChange={handlePeriodChange}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </Select>
          </div>

          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {error && (
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
          </div>
        </Card>
      )}

      {report && (
        <>
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Previous Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(report.summary.previousBalance)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cash In</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.summary.cashIn)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cash Out</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(report.summary.cashOut)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Balance</p>
                  <p className={`text-2xl font-bold ${getBalanceColor(report.summary.netBalance)}`}>
                    {formatCurrency(report.summary.netBalance)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  report.summary.netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {(() => {
                    const IconComponent = getBalanceIcon(report.summary.netBalance);
                    return <IconComponent className={`h-6 w-6 ${
                      report.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`} />;
                  })()}
                </div>
              </div>
            </Card>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Entries */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Purchase Entries</h3>
                <Badge variant="secondary">{report.transactions.purchases.length} entries</Badge>
              </div>
              
              <div className="space-y-3">
                {report.transactions.purchases.length > 0 ? (
                  report.transactions.purchases.map((purchase, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{purchase.itemName}</p>
                        <p className="text-sm text-gray-600">
                          {purchase.quantity} units × {formatCurrency(purchase.unitPrice)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          {formatCurrency(purchase.totalPrice)}
                        </p>
                        <Badge 
                          className={`text-xs ${
                            purchase.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                            purchase.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {purchase.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No purchase entries found</p>
                )}
              </div>
            </Card>

            {/* Payments */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
                <Badge variant="secondary">{report.transactions.payments.length} payments</Badge>
              </div>
              
              <div className="space-y-3">
                {report.transactions.payments.length > 0 ? (
                  report.transactions.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payment.description || 'Payment'}</p>
                        <p className="text-sm text-gray-600">{payment.method}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </p>
                        <Badge 
                          className={`text-xs ${
                            payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No payments found</p>
                )}
              </div>
            </Card>
          </div>

          {/* Report Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Report Period</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{report.period}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-lg font-semibold text-gray-900">{report.totalTransactions}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Date Range</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(report.dateRange.start).toLocaleDateString()} - {new Date(report.dateRange.end).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
