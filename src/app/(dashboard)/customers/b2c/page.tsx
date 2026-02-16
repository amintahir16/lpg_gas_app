'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';
import { CustomSelect } from '@/components/ui/select-custom';

// Palette for dynamic cylinder badges
const CYLINDER_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-lime-100 text-lime-800 border-lime-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-sky-100 text-sky-800 border-sky-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
];

const getCylinderColor = (type: string) => {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CYLINDER_COLORS.length;
  return CYLINDER_COLORS[index];
};

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
  marginCategoryId: string | null;
  cylinderHoldings: {
    cylinderType: string;
    quantity: number;
    isReturned: boolean;
  }[];
}

interface B2CCustomersResponse {
  customers: B2CCustomer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalCustomers: number;
    totalProfit: number;
    cylinderBreakdown: Record<string, number>;
  };
  cylinderTypes: string[];
  typeDefinitions: Record<string, { name: string; capacity: number }>;
}

export default function B2CCustomersPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<B2CCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [summary, setSummary] = useState<{
    totalCustomers: number;
    totalProfit: number;
    cylinderBreakdown: Record<string, number>;
  }>({
    totalCustomers: 0,
    totalProfit: 0,
    cylinderBreakdown: {}
  });
  const [cylinderTypes, setCylinderTypes] = useState<string[]>([]);
  const [typeDefinitions, setTypeDefinitions] = useState<Record<string, { name: string; capacity: number }>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<B2CCustomer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [marginCategories, setMarginCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Filters State
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'PROFIT' | 'NAME'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchTerm, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearchTerm, pagination.page, filterStatus, sortBy, sortOrder]);

  // Fetch margin categories
  useEffect(() => {
    const fetchMarginCategories = async () => {
      try {
        const response = await fetch('/api/admin/margin-categories?customerType=B2C&activeOnly=true');
        if (response.ok) {
          const data = await response.json();
          setMarginCategories(data);
        }
      } catch (error) {
        console.error('Error fetching margin categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchMarginCategories();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        // Note: Currently API might not support all these sorts/filters perfectly
        // but adding params for future consistency
        status: filterStatus,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/customers/b2c?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch B2C customers');
      }

      const data: B2CCustomersResponse = await response.json();
      setCustomers(data.customers);
      setPagination(data.pagination);
      setSummary(data.summary);
      setCylinderTypes(data.cylinderTypes || []);
      setTypeDefinitions(data.typeDefinitions || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (formData: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/customers/b2c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      setShowAddForm(false);
      setPagination(prev => ({ ...prev, page: 1 }));
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async (formData: any) => {
    if (!editingCustomer) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/customers/b2c/${editingCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update customer');
      }

      setShowEditForm(false);
      setEditingCustomer(null);
      await fetchCustomers();

    } catch (err) {
      console.error('Error updating customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/customers/b2c/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }

      setDeleteConfirm(null);
      await fetchCustomers();

    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCustomer = (customer: B2CCustomer) => {
    setEditingCustomer(customer);
    setShowEditForm(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAddress = (customer: B2CCustomer) => {
    // If explicit new fields are used, use them
    if (customer.houseNumber || customer.street || customer.sector) {
      const parts = [];
      if (customer.houseNumber) parts.push(`H.No: ${customer.houseNumber}`);
      if (customer.sector) parts.push(`Sector: ${customer.sector}`);
      if (customer.street) parts.push(`St: ${customer.street}`);
      if (customer.phase) parts.push(`Ph: ${customer.phase}`);
      if (customer.area) parts.push(customer.area);
      return parts.join(', ');
    }
    // Fallback to full address field
    return customer.address;
  };

  const getCylinderHoldingsByType = (customer: B2CCustomer, type: string) => {
    const holding = customer.cylinderHoldings.find(h => h.cylinderType === type && !h.isReturned);
    return holding ? holding.quantity : 0;
  };

  const getDynamicDisplayName = (type: string) => {
    if (typeDefinitions[type]) {
      const { name, capacity } = typeDefinitions[type];
      return `${name} (${capacity}kg)`;
    }
    return getCylinderTypeDisplayName(type);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/customers')}
              className="mr-2 text-gray-500 hover:text-gray-900 -ml-2"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HomeIcon className="w-8 h-8 mr-3 text-green-600" />
            Homes (B2C Customers)
          </h1>
          <p className="mt-1 text-gray-500">
            Manage home customers, security deposits, and cylinder distribution
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => router.push('/customers/b2c/ledger')}
            variant="outline"
            className="font-semibold"
          >
            View Ledger
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Card className="border shadow-sm bg-white overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-gray-100">
          {/* Total Cylinders */}
          <div className="p-2 flex flex-col items-center text-center hover:bg-orange-50/50 transition-colors">
            <span className="text-[10px] font-medium text-orange-600 uppercase tracking-wider mb-0.5">TOTAL CYLINDERS WITH CUSTOMERS AGAINST SECURITY</span>
            <span className="text-xl font-bold text-gray-900 mb-0.5">
              {Object.values(summary.cylinderBreakdown).reduce((a, b) => a + b, 0)}
            </span>
            <div className="flex flex-wrap justify-center gap-1 mt-1 max-h-[60px] overflow-y-auto w-full px-1">
              {Object.entries(summary.cylinderBreakdown).map(([type, count]) => (
                <Badge key={type} variant="secondary" className={`${getCylinderColor(type)} font-normal text-[9px] py-0 px-1.5 h-4 hover:opacity-80`}>
                  {getDynamicDisplayName(type)}: <span className="font-bold ml-1">{count}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Total Customers */}
          <div className="p-2 flex flex-col items-center text-center hover:bg-blue-50/50 transition-colors">
            <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wider mb-0.5">Total Customers</span>
            <span className="text-xl font-bold text-gray-900 mb-0.5">{summary.totalCustomers}</span>
            <span className="text-[10px] text-gray-500">
              {filterStatus === 'ACTIVE' ? 'Active in last 7 days' :
                filterStatus === 'INACTIVE' ? 'No recent activity' : 'All Registered'}
            </span>
          </div>

          {/* Total Profit */}
          <div className="p-2 flex flex-col items-center text-center hover:bg-green-50/50 transition-colors">
            <span className="text-[10px] font-medium text-green-600 uppercase tracking-wider mb-0.5">Total Profit</span>
            <span className="text-xl font-bold text-green-600 mb-0.5">{formatCurrency(summary.totalProfit)}</span>
            <span className="text-[10px] text-gray-500">Estimated Gross Profit</span>
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name, phone, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2 min-w-48 items-center">
              <div className="flex-1">
                <CustomSelect
                  name="sortBy"
                  value={sortBy}
                  onChange={(val) => setSortBy(val as any)}
                  options={[
                    { value: 'createdAt', label: 'Date Added' },
                    { value: 'PROFIT', label: 'Profit' },
                    { value: 'NAME', label: 'Name' }
                  ]}
                  className="h-9 text-sm"
                />
              </div>
              <Button
                variant="outline"
                className="w-9 h-9 px-0 flex items-center justify-center border-gray-300"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? "Ascending" : "Descending"}
              >
                {sortOrder === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-500 self-center mr-2"><FunnelIcon className="w-4 h-4 inline mr-1" />Filters:</span>

            {/* Status Filter */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterStatus === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >All Status</button>
              <button
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterStatus === 'ACTIVE' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >Active Customers</button>
              <button
                onClick={() => setFilterStatus('INACTIVE')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterStatus === 'INACTIVE' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >Inactive Customers</button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 font-bold">!</span>
            </div>
            <p className="text-red-700 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto text-red-700 hover:bg-red-100">Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {/* Customers Table */}
      <Card className="border shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">B2C Customer Database</CardTitle>
              <CardDescription className="text-gray-500 mt-1">
                Complete list of home customers with cylinder details
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-gray-500">Total Results</span>
              <p className="text-2xl font-bold text-gray-900 leading-none">{pagination.total}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <UserGroupIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No Customers Found</h3>
              <p className="text-gray-500 max-w-sm mt-1 mb-6">
                We couldn't find any customers matching your current search or filters.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
              }}>Clear All Filters</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700 w-[200px]">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700 w-[250px]">Address</TableHead>
                    <TableHead className="font-semibold text-gray-700 w-[150px]">Phone</TableHead>

                    {/* Dynamic Cylinder Columns */}
                    {cylinderTypes.map(type => (
                      <TableHead key={type} className="text-center font-semibold text-gray-700 min-w-[80px]">
                        {getDynamicDisplayName(type) || type}
                      </TableHead>
                    ))}

                    <TableHead className="font-semibold text-gray-700 text-right w-[120px]">Profit</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center w-[100px]">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-green-50/30 transition-colors group"
                      onClick={() => router.push(`/customers/b2c/${customer.id}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{customer.name}</div>
                          {customer.email && (
                            <div className="text-xs text-gray-500 mt-0.5">{customer.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center max-w-xs">
                          <MapPinIcon className="w-4 h-4 mr-1 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 text-sm truncate" title={formatAddress(customer)}>
                            {formatAddress(customer)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">{customer.phone}</TableCell>

                      {/* Dynamic Cylinder Counts */}
                      {cylinderTypes.map(type => {
                        const count = getCylinderHoldingsByType(customer, type);
                        return (
                          <TableCell key={type} className="text-center">
                            {count > 0 ? (
                              <Badge variant="secondary" className={`${getCylinderColor(type)} font-bold hover:opacity-80`}>
                                {count}
                              </Badge>
                            ) : <span className="text-gray-300">-</span>}
                          </TableCell>
                        );
                      })}

                      <TableCell className="font-semibold text-gray-900 text-right">
                        {formatCurrency(customer.totalProfit)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${customer.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${customer.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCustomer(customer);
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(customer.id);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} entries
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                        className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${pagination.page === p ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit B2C Customer Modal */}
      {showEditForm && editingCustomer && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit B2C Customer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update customer information</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEditForm(false)} className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Close</span>
                <span className="text-xl">×</span>
              </Button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateCustomer({
                  name: formData.get('name'),
                  phone: formData.get('phone'),
                  email: formData.get('email'),
                  address: formData.get('address'),
                  marginCategoryId: formData.get('marginCategoryId'),
                  isActive: formData.get('isActive') === 'true',
                  city: 'Hayatabad'
                });
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Customer Name</label>
                    <Input name="name" type="text" defaultValue={editingCustomer.name} required className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label>
                    <Input name="phone" type="tel" defaultValue={editingCustomer.phone} required className="h-9" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                  <Input name="email" type="email" defaultValue={editingCustomer.email || ''} className="h-9" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Margin Category *
                  </label>
                  <CustomSelect
                    name="marginCategoryId"
                    required
                    disabled={loadingCategories}
                    defaultValue={editingCustomer.marginCategoryId || ''}
                    placeholder={loadingCategories ? "Loading..." : "Select Category"}
                    options={marginCategories.map(c => ({ value: c.id, label: `${c.name} - Rs ${c.marginPerKg}/kg` }))}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Address</label>
                  <Textarea name="address" rows={3} defaultValue={editingCustomer.address} required className="resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                  <CustomSelect
                    name="isActive"
                    defaultValue={editingCustomer.isActive ? 'true' : 'false'}
                    options={[
                      { value: 'true', label: 'Active' },
                      { value: 'false', label: 'Inactive' }
                    ]}
                    className="h-9"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowEditForm(false)}
                    className="font-medium"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-medium bg-green-600 hover:bg-green-700" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update Customer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-96 shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Customer</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this customer? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteCustomer(deleteConfirm)}
                  className="font-medium bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add B2C Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add New B2C Customer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter key customer details below</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Close</span>
                <span className="text-xl">×</span>
              </Button>
            </div>
            <div className="p-6">
              <form className="space-y-5" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddCustomer({
                  name: formData.get('name'),
                  phone: formData.get('phone'),
                  email: formData.get('email'),
                  address: formData.get('address'),
                  marginCategoryId: formData.get('marginCategoryId'),
                  city: 'Hayatabad' // Default value
                });
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Customer Name</label>
                    <Input name="name" type="text" placeholder="e.g. John Doe" required className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label>
                    <Input name="phone" type="tel" placeholder="0300 1234567" required className="h-9" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                  <Input name="email" type="email" placeholder="email@example.com (Optional)" className="h-9" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Margin Category *
                  </label>
                  <CustomSelect
                    name="marginCategoryId"
                    required
                    disabled={loadingCategories}
                    placeholder={loadingCategories ? "Loading..." : "Select Category"}
                    options={marginCategories.map(c => ({ value: c.id, label: `${c.name} (Rs ${c.marginPerKg}/kg)` }))}
                    className="h-9"
                    value={undefined}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Address</label>
                  <Textarea name="address" rows={3} placeholder="Enter complete address details..." required className="resize-none" />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                    className="font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-medium bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Customer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
