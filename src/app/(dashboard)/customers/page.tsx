'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { BanknotesIcon, BriefcaseIcon, CubeIcon, HomeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface Customer {
  id: string;
  name: string;
  type: string;
  contactPerson: string;
  email: string | null;
  phone: string;
  creditLimit: number | string;
  isActive: boolean;
  createdAt: string;
  notes?: string | null;
}

interface Summary {
  totalCustomers: number;
  totalB2bCustomers: number;
  totalB2cCustomers: number;
  totalReceivables: number;
  totalSecurityHoldings: number;
  totalCylindersCount: number;
}

interface CustomersResponse {
  customers: Customer[];
  summary: Summary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'B2B' | 'B2C'>('ALL');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchTerm, filterStatus, filterType]);

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearchTerm, pagination.page, filterStatus, filterType]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        status: filterStatus,
        type: filterType,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/customers/combined?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data: CustomersResponse = await response.json();
      setCustomers(data.customers);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'B2B':
        return 'info';
      case 'B2C':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getCustomerTypeDisplay = (customer: Customer) => {
    // Always return the simplified type (B2B or B2C)
    return customer.type;
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };


  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="mt-1 text-sm text-gray-600 font-medium">
            Manage your customer database and relationships
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button
            onClick={() => router.push('/customers/b2c')}
            size="sm"
            className="font-semibold h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm"
          >
            B2C Customers
          </Button>
          <Button
            onClick={() => router.push('/customers/b2b')}
            size="sm"
            className="font-semibold h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            B2B Customers
          </Button>
        </div>
      </div>

      {/* Stats Summary Card */}
      {summary && (
        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-gray-100">
            {/* Total Customers */}
            <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50/50 transition-colors">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                <UserGroupIcon className="w-3.5 h-3.5 mr-1" /> All Customers
              </span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                {summary.totalCustomers}
              </span>
              <div className="flex gap-2 mt-1.5 text-[10px] text-gray-500 font-medium">
                <span className="flex items-center"><HomeIcon className="w-3 h-3 mr-0.5 text-green-600" /> {summary.totalB2cCustomers}</span>
                <span className="flex items-center"><BriefcaseIcon className="w-3 h-3 mr-0.5 text-blue-600" /> {summary.totalB2bCustomers}</span>
              </div>
            </div>

            {/* Total Cylinders */}
            <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-orange-50/50 transition-colors">
              <span className="text-[10px] sm:text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1 flex items-center">
                <CubeIcon className="w-3.5 h-3.5 mr-1" /> Total Cylinders
              </span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                {summary.totalCylindersCount}
              </span>
              <span className="text-[10px] text-gray-500 mt-1.5 font-medium">Currently in circulation</span>
            </div>

            {/* Total Receivables */}
            <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-red-50/50 transition-colors">
              <span className="text-[10px] sm:text-xs font-semibold text-red-600 uppercase tracking-wider mb-1 flex items-center">
                <BanknotesIcon className="w-3.5 h-3.5 mr-1" /> B2B Receivables
              </span>
              <span className="text-xl sm:text-2xl font-bold text-red-600 leading-tight">
                {formatCurrency(summary.totalReceivables)}
              </span>
              <span className="text-[10px] text-gray-500 mt-1.5 font-medium">Total outstanding</span>
            </div>

            {/* Security Held */}
            <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-purple-50/50 transition-colors">
              <span className="text-[10px] sm:text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1 flex items-center">
                <BanknotesIcon className="w-3.5 h-3.5 mr-1" /> Security Held
              </span>
              <span className="text-xl sm:text-2xl font-bold text-purple-600 leading-tight">
                {formatCurrency(summary.totalSecurityHoldings)}
              </span>
              <span className="text-[10px] text-gray-500 mt-1.5 font-medium">From Homes (B2C)</span>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && customers.length === 0 && !error && (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600 font-medium">Loading customers...</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm bg-gray-50/50"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Filters:</span>
              <div className="flex bg-gray-100/50 p-1 rounded-lg">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterStatus === status
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                  >
                    {status === 'ALL' ? 'All Status' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100/50 p-1 rounded-lg">
                {(['ALL', 'B2B', 'B2C'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterType === type
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                  >
                    {type === 'ALL' ? 'All Categories' : type === 'B2B' ? 'B2B Industries' : 'B2C Homes'}
                  </button>
                ))}
              </div>
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

      {/* Customers Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Name</TableHead>

                <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                <TableHead className="font-semibold text-gray-700">Type</TableHead>
                <TableHead className="font-semibold text-gray-700">Credit Limit</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    if (customer.type === 'B2B') {
                      router.push(`/customers/b2b/${customer.id}`);
                    } else {
                      router.push(`/customers/b2c/${customer.id}`);
                    }
                  }}
                >
                  <TableCell className="font-semibold text-gray-900">{customer.name}</TableCell>

                  <TableCell className="text-gray-700">{customer.phone}</TableCell>
                  <TableCell>
                    <Badge variant={getCustomerTypeColor(customer.type) as any} className="font-semibold">
                      {getCustomerTypeDisplay(customer)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    Rs {(Number(customer.creditLimit) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${customer.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${customer.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100">
              <p className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} customers
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
} 