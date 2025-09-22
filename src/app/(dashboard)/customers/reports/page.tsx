'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface ReportData {
  arSummary?: {
    totalOutstanding: number;
    totalCustomers: number;
    averageAge: number;
    overdueAmount: number;
    customers: Array<{
      id: string;
      name: string;
      ledgerBalance: number;
      paymentTermsDays: number;
      lastTransactionDate: string;
    }>;
  };
  cylinderDue?: {
    totalDomesticDue: number;
    totalStandardDue: number;
    totalCommercialDue: number;
    customers: Array<{
      id: string;
      name: string;
      domestic118kgDue: number;
      standard15kgDue: number;
      commercial454kgDue: number;
    }>;
  };
  buyback?: {
    totalBuybackAmount: number;
    totalCylinders: number;
    transactions: Array<{
      id: string;
      billSno: string;
      customerName: string;
      date: string;
      totalAmount: number;
      items: Array<{
        productName: string;
        quantity: number;
        buybackTotal: number;
      }>;
    }>;
  };
  inventory?: {
    products: Array<{
      id: string;
      name: string;
      stockQuantity: number;
      stockType: string;
      remainingKg: number | null;
      lowStockThreshold: number;
      isLowStock: boolean;
    }>;
  };
  sales?: {
    totalSales: number;
    totalTransactions: number;
    averageTransactionValue: number;
    transactions: Array<{
      id: string;
      billSno: string;
      customerName: string;
      date: string;
      totalAmount: number;
      items: Array<{
        productName: string;
        quantity: number;
        totalPrice: number;
      }>;
    }>;
  };
  dailyCashbook?: {
    totalReceipts: number;
    totalPayments: number;
    netCash: number;
    transactions: Array<{
      id: string;
      billSno: string;
      customerName: string;
      date: string;
      transactionType: string;
      amount: number;
      paymentReference: string | null;
    }>;
  };
}

export default function CustomerReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({});
  const [selectedReport, setSelectedReport] = useState<string>('ar-summary');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const reportTypes = [
    { value: 'ar-summary', label: 'AR Summary', icon: CurrencyDollarIcon },
    { value: 'ar-aging', label: 'AR Aging Report', icon: ClockIcon },
    { value: 'cylinder-due', label: 'Cylinder Due', icon: CubeIcon },
    { value: 'buyback', label: 'Buyback Report', icon: ArrowPathIcon },
    { value: 'inventory', label: 'Inventory Status', icon: ChartBarIcon },
    { value: 'sales', label: 'Sales Report', icon: DocumentTextIcon },
    { value: 'daily-cashbook', label: 'Daily Cashbook', icon: ClockIcon },
  ];

  const fetchReportData = async (reportType: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      let endpoint = '/api/reports/b2b';
      if (reportType === 'ar-aging') {
        endpoint = '/api/reports/ar-aging';
      } else if (reportType === 'buyback') {
        endpoint = '/api/reports/buyback';
      } else if (reportType === 'daily-cashbook') {
        endpoint = '/api/reports/daily-cashbook';
      }
      
      const response = await fetch(`${endpoint}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(prev => ({ ...prev, [reportType]: data }));
      } else {
        console.error('Failed to fetch report data');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(selectedReport);
  }, [selectedReport, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK');
  };

  const getReportIcon = (reportType: string) => {
    const report = reportTypes.find(r => r.value === reportType);
    return report ? report.icon : DocumentTextIcon;
  };

  const renderARSummary = () => {
    const data = reportData.arSummary;
    if (!data) return <div>Loading AR Summary...</div>;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totalOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Customers</p>
                  <p className="text-2xl font-bold text-blue-600">{data.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Age (Days)</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.averageAge}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Overdue Amount</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.overdueAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Customer Outstanding Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Ledger Balance</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Last Transaction</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className={customer.ledgerBalance > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {formatCurrency(customer.ledgerBalance)}
                    </TableCell>
                    <TableCell>{customer.paymentTermsDays} days</TableCell>
                    <TableCell>{formatDate(customer.lastTransactionDate)}</TableCell>
                    <TableCell>
                      <Badge variant={customer.ledgerBalance > 0 ? 'destructive' : 'secondary'}>
                        {customer.ledgerBalance > 0 ? 'Outstanding' : 'In Credit'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCylinderDue = () => {
    const data = reportData.cylinderDue;
    if (!data) return <div>Loading Cylinder Due Report...</div>;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">11.8kg Due</p>
                  <p className="text-2xl font-bold text-blue-600">{data.totalDomesticDue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">15kg Due</p>
                  <p className="text-2xl font-bold text-green-600">{data.totalStandardDue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">45.4kg Due</p>
                  <p className="text-2xl font-bold text-purple-600">{data.totalCommercialDue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Customer Cylinder Due Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>11.8kg Due</TableHead>
                  <TableHead>15kg Due</TableHead>
                  <TableHead>45.4kg Due</TableHead>
                  <TableHead>Total Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customers.map((customer) => {
                  const totalDue = customer.domestic118kgDue + customer.standard15kgDue + customer.commercial454kgDue;
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.domestic118kgDue}</TableCell>
                      <TableCell>{customer.standard15kgDue}</TableCell>
                      <TableCell>{customer.commercial454kgDue}</TableCell>
                      <TableCell className="font-semibold">{totalDue}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSalesReport = () => {
    const data = reportData.sales;
    if (!data) return <div>Loading Sales Report...</div>;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-600">{data.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Transaction</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(data.averageTransactionValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Details */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Sales Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">{transaction.billSno}</TableCell>
                    <TableCell className="font-medium">{transaction.customerName}</TableCell>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatCurrency(transaction.totalAmount)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {transaction.items.map((item, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {item.quantity}x {item.productName} = {formatCurrency(item.totalPrice)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderReport = () => {
    switch (selectedReport) {
      case 'ar-summary':
        return renderARSummary();
      case 'cylinder-due':
        return renderCylinderDue();
      case 'sales':
        return renderSalesReport();
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Select a report type to view data</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push('/customers')}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Customers
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Reports</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Comprehensive reporting for B2B customer management
          </p>
        </div>
      </div>

      {/* Report Controls */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Report Type
              </label>
              <Select
                value={selectedReport}
                onValueChange={setSelectedReport}
              >
                {reportTypes.map((report) => (
                  <option key={report.value} value={report.value}>
                    {report.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button
                onClick={() => fetchReportData(selectedReport)}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  <>
                    <ChartBarIcon className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
              <Button variant="outline" className="flex items-center">
                <PrinterIcon className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="flex items-center">
                <DocumentArrowDownIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {renderReport()}
    </div>
  );
}
