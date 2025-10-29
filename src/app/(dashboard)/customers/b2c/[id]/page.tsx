'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HomeIcon, ArrowLeftIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, PlusIcon, CalendarIcon, EyeIcon, FunnelIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';

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
  googleMapLocation: string | null;
  cylinderHoldings: {
    id: string;
    cylinderType: string;
    quantity: number;
    securityAmount: number;
    issueDate: string;
    returnDate: string | null;
    isReturned: boolean;
    returnDeduction: number;
  }[];
  transactions: {
    id: string;
    billSno: string;
    date: string;
    time: string;
    totalAmount: number;
    deliveryCharges: number;
    finalAmount: number;
    paymentMethod: string;
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
  }[];
}

export default function B2CCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<B2CCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Report download states
  const [reportDateFilter, setReportDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showReportDateFilter, setShowReportDateFilter] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId, searchParams, dateFilter.startDate, dateFilter.endDate]);

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

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (dateFilter.startDate) {
        params.append('startDate', dateFilter.startDate);
      }
      if (dateFilter.endDate) {
        params.append('endDate', dateFilter.endDate);
      }
      
      const queryString = params.toString();
      const url = `/api/customers/b2c/${customerId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        cache: 'no-store' // Always fetch fresh data
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer details');
      }
      
      const data = await response.json();
      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCylinderTypeColor = (type: string) => {
    switch (type) {
      case 'DOMESTIC_11_8KG':
        return 'success';
      case 'STANDARD_15KG':
        return 'info';
      case 'COMMERCIAL_45_4KG':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getCylinderTypeDisplay = (type: string) => {
    switch (type) {
      case 'DOMESTIC_11_8KG':
        return 'Domestic (11.8kg)';
      case 'STANDARD_15KG':
        return 'Standard (15kg)';
      case 'COMMERCIAL_45_4KG':
        return 'Commercial (45.4kg)';
      default:
        return type;
    }
  };

  const formatAddress = (customer: B2CCustomer) => {
    const parts = [];
    if (customer.houseNumber) parts.push(`H.No: ${customer.houseNumber}`);
    if (customer.sector) parts.push(`Sector: ${customer.sector}`);
    if (customer.street) parts.push(`St: ${customer.street}`);
    if (customer.phase) parts.push(`Ph: ${customer.phase}`);
    if (customer.area) parts.push(customer.area);
    return parts.join(', ') || customer.address;
  };

  const activeCylinders = customer?.cylinderHoldings.filter(h => !h.isReturned) || [];
  const totalSecurityAmount = activeCylinders.reduce((sum, h) => sum + (Number(h.securityAmount) * h.quantity), 0);

  const handleDownloadReport = async () => {
    if (!customer) return;
    
    setDownloadingReport(true);
    try {
      const params = new URLSearchParams();
      if (reportDateFilter.startDate) {
        params.append('startDate', reportDateFilter.startDate);
      }
      if (reportDateFilter.endDate) {
        params.append('endDate', reportDateFilter.endDate);
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/customers/b2c')}
            className="mr-4 flex items-center"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to B2C Customers
          </Button>
        </div>
        <Card className="border-0 shadow-sm bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-red-700 font-medium">{error || 'Customer not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/customers/b2c')}
              className="mr-4 flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to B2C Customers
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HomeIcon className="w-8 h-8 mr-3 text-green-600" />
            {customer.name}
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Customer Home: {formatAddress(customer)}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button 
            onClick={() => router.push(`/customers/b2c/${customerId}/transaction`)}
            className="font-semibold"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-lg font-bold">₹</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-gray-900">Rs {Number(customer.totalProfit).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-lg font-bold">🔥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Security Held</p>
                <p className="text-2xl font-bold text-gray-900">Rs {Number(totalSecurityAmount).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-lg font-bold">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Cylinders</p>
                <p className="text-2xl font-bold text-gray-900">{activeCylinders.reduce((sum, h) => sum + h.quantity, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-lg font-bold">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{customer.transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <PhoneIcon className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-gray-700">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-700">{customer.email}</span>
              </div>
            )}
            <div className="flex items-start">
              <MapPinIcon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <p className="text-gray-700">{formatAddress(customer)}</p>
                <p className="text-gray-700">{customer.city}</p>
                {customer.googleMapLocation && (
                  <a 
                    href={customer.googleMapLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline mt-1 inline-block"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            </div>
            <div className="pt-2">
              <Badge variant={customer.isActive ? 'success' : 'destructive'} className="font-semibold">
                {customer.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cylinder Holdings */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Current Cylinder Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {activeCylinders.length > 0 ? (
              <div className="space-y-3">
                {activeCylinders.map((holding) => (
                  <div key={holding.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Badge variant={getCylinderTypeColor(holding.cylinderType) as any} className="font-semibold">
                        {getCylinderTypeDisplay(holding.cylinderType)} x{holding.quantity}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1" suppressHydrationWarning>
                        Issued: {new Date(holding.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">Rs {Number(holding.securityAmount).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Security</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No active cylinder holdings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Transaction History</CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Complete transaction history for this customer
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Filter Button */}
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
                
                {/* Date Filter Dropdown */}
                {showDateFilter && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 date-filter-container">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Filter by Date Range
                      </h3>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={dateFilter.startDate}
                          onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                          className="w-full text-sm"
                          max={dateFilter.endDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={dateFilter.endDate}
                          onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                          className="w-full text-sm"
                          min={dateFilter.startDate || undefined}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDateFilter({ startDate: '', endDate: '' });
                          }}
                          className="flex-1 text-xs"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowDateFilter(false);
                          }}
                          className="flex-1 text-xs"
                        >
                          Apply Filter
                        </Button>
                      </div>
                      
                      {(dateFilter.startDate || dateFilter.endDate) && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600">
                            {(dateFilter.startDate && dateFilter.endDate) ? (
                              <>
                                Showing transactions from <strong>{new Date(dateFilter.startDate).toLocaleDateString()}</strong> to <strong>{new Date(dateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            ) : dateFilter.startDate ? (
                              <>
                                Showing transactions from <strong>{new Date(dateFilter.startDate).toLocaleDateString()}</strong> onwards
                              </>
                            ) : (
                              <>
                                Showing transactions up to <strong>{new Date(dateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Trans Report Button */}
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
                  {downloadingReport && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 ml-1"></div>
                  )}
                </Button>
                
                {/* Report Date Filter Dropdown */}
                {showReportDateFilter && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 report-date-filter-container">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Select Date Range for Report
                      </h3>
                      <button
                        onClick={() => setShowReportDateFilter(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={reportDateFilter.startDate}
                          onChange={(e) => setReportDateFilter({ ...reportDateFilter, startDate: e.target.value })}
                          className="w-full text-sm"
                          max={reportDateFilter.endDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={reportDateFilter.endDate}
                          onChange={(e) => setReportDateFilter({ ...reportDateFilter, endDate: e.target.value })}
                          className="w-full text-sm"
                          min={reportDateFilter.startDate || undefined}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReportDateFilter({ startDate: '', endDate: '' });
                          }}
                          className="flex-1 text-xs"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDownloadReport}
                          disabled={downloadingReport}
                          className="flex-1 text-xs"
                        >
                          {downloadingReport ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Generating...
                            </div>
                          ) : (
                            'Download PDF'
                          )}
                        </Button>
                      </div>
                      
                      {(reportDateFilter.startDate || reportDateFilter.endDate) && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600">
                            {(reportDateFilter.startDate && reportDateFilter.endDate) ? (
                              <>
                                Report will include transactions from <strong>{new Date(reportDateFilter.startDate).toLocaleDateString()}</strong> to <strong>{new Date(reportDateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            ) : reportDateFilter.startDate ? (
                              <>
                                Report will include transactions from <strong>{new Date(reportDateFilter.startDate).toLocaleDateString()}</strong> onwards
                              </>
                            ) : (
                              <>
                                Report will include transactions up to <strong>{new Date(reportDateFilter.endDate).toLocaleDateString()}</strong>
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customer.transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Bill No.</TableHead>
                  <TableHead className="font-semibold text-gray-700">Items</TableHead>
                  <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.transactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/customers/b2c/${customerId}/transactions/${transaction.id}`)}
                  >
                    <TableCell>
                      <div suppressHydrationWarning>
                        <p className="font-semibold text-gray-900">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.time).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">{transaction.billSno}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {transaction.gasItems.map((item, index) => (
                          <Badge key={index} variant="info" className="text-xs mr-1">
                            {getCylinderTypeDisplay(item.cylinderType)} x{item.quantity}
                          </Badge>
                        ))}
                        {transaction.securityItems.length > 0 && (
                          <Badge variant="warning" className="text-xs mr-1">
                            Security x{transaction.securityItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </Badge>
                        )}
                        {transaction.accessoryItems.map((item, index) => (
                          <Badge key={index} variant="secondary" className="text-xs mr-1">
                            {item.productName} x{item.quantity}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-gray-900">Rs {Number(transaction.finalAmount).toFixed(2)}</p>
                        {transaction.deliveryCharges > 0 && (
                          <p className="text-sm text-gray-600">
                            + Rs {Number(transaction.deliveryCharges).toFixed(2)} delivery
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant="success" className="font-semibold">
                          {transaction.paymentMethod}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/customers/b2c/${customerId}/transactions/${transaction.id}`);
                          }}
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600 mb-4">This customer hasn't made any transactions yet</p>
              <Button 
                onClick={() => router.push(`/customers/b2c/${customerId}/transaction`)}
                className="font-semibold"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create First Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
