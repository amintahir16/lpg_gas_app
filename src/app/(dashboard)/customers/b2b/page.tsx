'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon
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

interface B2BCustomer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string | null;
  address: string | null;
  creditLimit: number | null;
  paymentTermsDays: number;
  ledgerBalance: number;
  domestic118kgDue: number;
  standard15kgDue: number;
  commercial454kgDue: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  marginCategoryId: string | null;
  holdings?: Record<string, number>;
}

interface B2BSummary {
  totalCustomers: number;
  totalReceivables: number;
  totalCylinders: number;
  cylinderBreakdown: Record<string, number>;
  totalProfit?: number;
}

interface B2BCustomersResponse {
  customers: B2BCustomer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: B2BSummary;
  cylinderTypes: string[];
}

export default function B2BCustomersPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<B2BCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<B2BCustomer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cylinderTypes, setCylinderTypes] = useState<string[]>([]);
  const [typeDefinitions, setTypeDefinitions] = useState<Record<string, { name: string; capacity: number }>>({});

  const [summary, setSummary] = useState<B2BSummary | null>(null);

  // Filters State
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'INDUSTRIAL' | 'RESTAURANT'>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'RECEIVABLES' | 'CYLINDERS' | 'NAME'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Margin categories for B2B customers
  const [marginCategories, setMarginCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchTerm, filterStatus, filterType, sortBy, sortOrder]);

  useEffect(() => {
    fetchB2BCustomers();
  }, [debouncedSearchTerm, pagination.page, filterStatus, filterType, sortBy, sortOrder]);

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchB2BCustomers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch margin categories for B2B customers
  useEffect(() => {
    const fetchMarginCategories = async () => {
      try {
        const response = await fetch('/api/admin/margin-categories?customerType=B2B&activeOnly=true');
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

  const fetchB2BCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        type: 'B2B',
        status: filterStatus,
        customerType: filterType,
        sortBy,
        sortOrder
      });

      console.log('Fetching B2B customers with params:', params.toString());
      const response = await fetch(`/api/customers/b2b?${params}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch B2B customers: ${response.status} ${text}`);
      }

      const data: any = await response.json(); // Use any temporarily to handle extended response

      setCustomers(data.customers || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
      setSummary(data.summary || null);

      if (data.cylinderTypes) {
        setCylinderTypes(data.cylinderTypes);
      }
      if (data.typeDefinitions) {
        setTypeDefinitions(data.typeDefinitions);
      }
    } catch (err) {
      console.error('Error fetching B2B customers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCustomers([]);
    } finally {
      setLoading(false);
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

  const formatCylinderHeader = (type: string) => {
    // Dynamic logic from typeDefinitions (matches B2C)
    if (typeDefinitions[type]) {
      const { name, capacity } = typeDefinitions[type];
      return `${name} ${capacity}kg`; // Format as "Name Capacitykg" (e.g. Domestic 11.8kg)
    }

    // Fallback logic
    if (type.includes('(') && type.includes(')')) {
      return type.replace('(', '').replace(')', '').replace('Cylinder ', '').replace('Cylinder', '');
    }

    const display = getCylinderTypeDisplayName(type);
    return display.replace('Cylinder (', '').replace(')', '').replace('Cylinder', type);
  };

  const getTotalCylindersDue = (customer: B2BCustomer) => {
    // Sum only physical holdings. Legacy dues are obsolete.
    if (customer.holdings && Object.keys(customer.holdings).length > 0) {
      return Object.values(customer.holdings).reduce((sum, count) => sum + count, 0);
    }
    return 0; // No physical holdings = 0 due
  };

  const handleAddCustomer = async (formData: any) => {
    try {
      setError(null);
      const response = await fetch('/api/customers/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: 'B2B' }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to create B2B customer');
      setShowAddForm(false);
      setPagination(prev => ({ ...prev, page: 1 }));
      await fetchB2BCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    }
  };

  const handleEditCustomer = (customer: B2BCustomer) => {
    setEditingCustomer(customer);
    setShowEditForm(true);
  };

  const getCustomerTypeFromNotes = (notes: string | null) => {
    if (!notes) return '';
    if (notes.includes('Customer Type:')) {
      const typePart = notes.split('Customer Type: ')[1];
      if (typePart) return typePart.split(' |')[0].trim();
    }
    return '';
  };

  const getCleanNotes = (notes: string | null) => {
    if (!notes) return '';
    if (notes.includes('Customer Type:')) {
      const parts = notes.split('|');
      if (parts.length > 1) return parts.slice(1).join('|').trim();
      return '';
    }
    return notes;
  };

  const handleUpdateCustomer = async (formData: any) => {
    if (!editingCustomer) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/customers/b2b/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to update customer');
      setShowEditForm(false);
      setEditingCustomer(null);
      await fetchB2BCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    if (deleteConfirmationName !== customer.name) {
      alert('Customer name does not match. Please type the exact customer name to confirm deletion.');
      return;
    }

    try {
      setIsLoading(true);
      setDeleteError(null);
      const response = await fetch(`/api/customers/b2b/${customerId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }
      setDeleteConfirm(null);
      setDeleteConfirmationName('');
      await fetchB2BCustomers();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setIsLoading(false);
    }
  };

  // Only show loading screen on initial load if we have NO data
  if (loading && customers.length === 0 && !error && !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

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
            <BuildingOfficeIcon className="w-8 h-8 mr-3 text-blue-600" />
            Industries & Restaurants (B2B)
          </h1>
          <p className="mt-1 text-gray-500">
            Manage B2B customers, cylinder dues, and account receivables
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={fetchB2BCustomers}
            variant="outline"
            disabled={loading}
          >
            <MagnifyingGlassIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add B2B Customer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <Card className="border shadow-sm bg-white overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-gray-100">
            {/* Total Cylinders */}
            <div className="p-2 flex flex-col items-center text-center hover:bg-red-50/50 transition-colors">
              <span className="text-[10px] font-medium text-red-600 uppercase tracking-wider mb-0.5">Total Cylinders With Customers</span>
              <span className="text-xl font-bold text-gray-900 mb-0.5">{summary.totalCylinders}</span>
              <div className="flex flex-wrap justify-center gap-1 mt-1 max-h-[60px] overflow-y-auto w-full px-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {Object.entries(summary.cylinderBreakdown).length > 0 ? (
                  Object.entries(summary.cylinderBreakdown).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className={`${getCylinderColor(type)} font-normal text-[9px] py-0 px-1.5 h-4 whitespace-nowrap hover:opacity-80`}>
                      {formatCylinderHeader(type)}: <span className="font-bold ml-1">{count}</span>
                    </Badge>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-400">No cylinders held</span>
                )}
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
            <div className="p-2 flex flex-col items-center text-center hover:bg-purple-50/50 transition-colors">
              <span className="text-[10px] font-medium text-purple-600 uppercase tracking-wider mb-0.5">Total Profit</span>
              <span className="text-xl font-bold text-green-600 mb-0.5">{formatCurrency(summary.totalProfit || 0)}</span>
              <span className="text-[10px] text-gray-500">Estimated Gross Profit</span>
            </div>

            {/* Total Receivables */}
            <div className="p-2 flex flex-col items-center text-center hover:bg-green-50/50 transition-colors">
              <span className="text-[10px] font-medium text-green-600 uppercase tracking-wider mb-0.5">Total Account Receivables</span>
              {/* Logic: Receivables (Customer owes) shown as negative red to match Net Balance logic */}
              <span className="text-xl font-bold text-red-600 mb-0.5">{formatCurrency(-summary.totalReceivables)}</span>
              <span className="text-[10px] text-gray-500">Outstanding Balance</span>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name, contact or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
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
                    { value: 'RECEIVABLES', label: 'Account Receivables' },
                    { value: 'CYLINDERS', label: 'Cylinder Quantity' },
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

            {/* Type Filter */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >All Types</button>
              <button
                onClick={() => setFilterType('RESTAURANT')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'RESTAURANT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >Restaurants</button>
              <button
                onClick={() => setFilterType('INDUSTRIAL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'INDUSTRIAL' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >Industries</button>
            </div>

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

      {/* B2B Customers Table */}
      <Card className="border shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">B2B Customer Database</CardTitle>
              <CardDescription className="text-gray-500 mt-1">
                Complete list of all B2B customers with cylinder dues and account receivables
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
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
                setFilterType('ALL');
              }}>Clear All Filters</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700 w-[250px]">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700 w-[200px]">Contact</TableHead>
                    <TableHead className="font-semibold text-gray-700 w-[120px]">Type</TableHead>

                    {/* Dynamic Headers */}
                    {cylinderTypes.length > 0 && cylinderTypes.map(type => (
                      <TableHead key={type} className="text-center font-semibold text-gray-700 min-w-[100px]">
                        {formatCylinderHeader(type)}
                      </TableHead>
                    ))}

                    <TableHead className="font-semibold text-gray-700 text-right w-[120px]">Total Due</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right w-[150px]">Receivables</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center w-[100px]">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-blue-50/30 transition-colors group"
                      onClick={() => router.push(`/customers/b2b/${customer.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{customer.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">ID: {customer.id.slice(-6)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-gray-700">{customer.contactPerson}</p>
                          <p className="text-xs text-gray-500">{customer.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-medium text-xs ${getCustomerTypeFromNotes(customer.notes) === 'RESTAURANT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            getCustomerTypeFromNotes(customer.notes) === 'INDUSTRIAL' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-gray-50 text-gray-700'
                            }`}
                        >
                          {getCustomerTypeFromNotes(customer.notes) || 'B2B'}
                        </Badge>
                      </TableCell>

                      {/* Dynamic Cylinder Cells */}
                      {cylinderTypes.length > 0 && cylinderTypes.map(type => {
                        const count = customer.holdings?.[type] || 0;
                        return (
                          <TableCell key={type} className="text-center">
                            {count > 0 ? (
                              <Badge variant="secondary" className={`${getCylinderColor(type)} font-bold hover:opacity-80`}>
                                {count}
                              </Badge>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </TableCell>
                        );
                      })}

                      <TableCell className="text-right">
                        <span className="font-bold text-gray-900">{getTotalCylindersDue(customer)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Net Balance Logic: Negative = Customer Owes (Red), Positive = Credit (Green) */}
                        <span className={`font-semibold ${-customer.ledgerBalance < 0 ? 'text-red-600' : -customer.ledgerBalance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {formatCurrency(-customer.ledgerBalance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${customer.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${customer.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
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
          {customers.length > 0 && pagination.pages > 1 && (
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
                    // Simple pagination logic for display
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                        className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${pagination.page === p ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
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

      {/* Keeping Modals Logic Same ... (Hidden for brevity in this full replacement but logic remains) */}
      {/* Add B2B Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add New B2B Customer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter key business details below</p>
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
                  contactPerson: formData.get('contactPerson'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  address: formData.get('address'),
                  creditLimit: formData.get('creditLimit'),
                  paymentTermsDays: formData.get('paymentTermsDays'),
                  notes: formData.get('notes'),
                  customerType: formData.get('customerType'),
                  marginCategoryId: formData.get('marginCategoryId')
                });
              }}>
                <div className="grid grid-cols-12 gap-x-4 gap-y-4">
                  {/* Row 1: Name & Type */}
                  <div className="col-span-8">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Company Name</label>
                    <Input name="name" type="text" placeholder="e.g. Acme Industries" required className="h-9" />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                    <CustomSelect
                      name="customerType"
                      required
                      placeholder="Select Type"
                      options={[
                        { value: 'INDUSTRIAL', label: 'Industrial' },
                        { value: 'RESTAURANT', label: 'Restaurant' }
                      ]}
                      className="h-9"
                    />
                  </div>

                  {/* Row 2: Contact & Phone */}
                  <div className="col-span-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Contact Person</label>
                    <Input name="contactPerson" type="text" required className="h-9" />
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label>
                    <Input name="phone" type="tel" required className="h-9" />
                  </div>

                  {/* Row 3: Address */}
                  <div className="col-span-12">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Address</label>
                    <Input name="address" type="text" className="h-9" />
                  </div>

                  {/* Row 4: Margin, Credit, Terms */}
                  <div className="col-span-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Margin Category *</label>
                    <CustomSelect
                      name="marginCategoryId"
                      required
                      disabled={loadingCategories}
                      placeholder={loadingCategories ? "Loading..." : "Select Category"}
                      options={marginCategories.map(c => ({ value: c.id, label: c.name }))}
                      className="h-9"
                      value={undefined} // Controlled not strictly needed for Add from, name attribute handles it
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Credit Limit</label>
                    <Input name="creditLimit" type="number" step="0.01" defaultValue="0" className="h-9" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Terms (Days)</label>
                    <Input name="paymentTermsDays" type="number" defaultValue="30" className="h-9" />
                  </div>

                  {/* Row 5: Notes */}
                  <div className="col-span-12">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Notes</label>
                    <Input name="notes" type="text" className="h-9" placeholder="Optional notes..." />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 mt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 px-6">Add Customer</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditForm && editingCustomer && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit B2B Customer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update business details below</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEditForm(false)} className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Close</span>
                <span className="text-xl">×</span>
              </Button>
            </div>
            <div className="p-6">
              <form className="space-y-5" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateCustomer({
                  name: formData.get('name'),
                  contactPerson: formData.get('contactPerson'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  address: formData.get('address'),
                  creditLimit: formData.get('creditLimit'),
                  paymentTermsDays: formData.get('paymentTermsDays'),
                  notes: formData.get('notes'),
                  customerType: formData.get('customerType'),
                  isActive: formData.get('isActive') === 'true',
                  marginCategoryId: formData.get('marginCategoryId')
                });
              }}>
                <div className="grid grid-cols-12 gap-x-4 gap-y-4">
                  {/* Row 1: Name & Type */}
                  <div className="col-span-8">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Company Name</label>
                    <Input name="name" type="text" defaultValue={editingCustomer.name} required className="h-9" />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                    <CustomSelect
                      name="customerType"
                      required
                      value={getCustomerTypeFromNotes(editingCustomer.notes) || 'INDUSTRIAL'}
                      // Update notes when type changes to reflect in state
                      onChange={(val) => setEditingCustomer(prev => prev ? { ...prev, notes: (prev.notes || '').replace(/Customer Type: \w+/, `Customer Type: ${val}`) } : null)}
                      options={[
                        { value: 'INDUSTRIAL', label: 'Industrial' },
                        { value: 'RESTAURANT', label: 'Restaurant' }
                      ]}
                      className="h-9"
                    />
                  </div>

                  {/* Row 2: Contact & Phone */}
                  <div className="col-span-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Contact Person</label>
                    <Input name="contactPerson" type="text" defaultValue={editingCustomer.contactPerson} required className="h-9" />
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label>
                    <Input name="phone" type="tel" defaultValue={editingCustomer.phone} required className="h-9" />
                  </div>

                  {/* Row 3: Address & Status */}
                  <div className="col-span-8">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Address</label>
                    <Input name="address" type="text" defaultValue={editingCustomer.address || ''} className="h-9" />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                    <CustomSelect
                      name="isActive"
                      required
                      value={String(editingCustomer.isActive)}
                      onChange={(val) => setEditingCustomer(prev => prev ? { ...prev, isActive: val === 'true' } : null)}
                      options={[
                        { value: 'true', label: 'Active' },
                        { value: 'false', label: 'Inactive' }
                      ]}
                      className="h-9"
                    />
                  </div>

                  {/* Row 4: Margin, Credit, Terms */}
                  <div className="col-span-6">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Margin Category</label>
                    <CustomSelect
                      name="marginCategoryId"
                      required
                      disabled={loadingCategories}
                      value={editingCustomer.marginCategoryId || ""}
                      onChange={(val) => setEditingCustomer(prev => prev ? { ...prev, marginCategoryId: val } : null)}
                      options={marginCategories.map(c => ({ value: c.id, label: c.name }))}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Credit Limit</label>
                    <Input name="creditLimit" type="number" step="0.01" defaultValue={editingCustomer.creditLimit || 0} className="h-9" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Terms (Days)</label>
                    <Input name="paymentTermsDays" type="number" defaultValue={editingCustomer.paymentTermsDays || 30} className="h-9" />
                  </div>

                  {/* Row 5: Notes */}
                  <div className="col-span-12">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Notes</label>
                    <Input name="notes" type="text" defaultValue={getCleanNotes(editingCustomer.notes) || ''} className="h-9" placeholder="Optional notes..." />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 mt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowEditForm(false)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 px-6">Update Customer</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Logic (Alert) */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Customer?</h3>
              <p className="text-gray-500 text-sm mb-6">
                To confirm deletion, please type the customer name: <span className="font-bold text-gray-900">{customers.find(c => c.id === deleteConfirm)?.name}</span>.
                <br /><span className="text-red-500 text-xs mt-2 block">This action cannot be undone.</span>
              </p>

              <Input
                placeholder="Type customer name..."
                value={deleteConfirmationName}
                onChange={(e) => {
                  setDeleteConfirmationName(e.target.value);
                  setDeleteError(null); // Clear error on typing
                }}
                className={`mb-4 ${deleteError ? 'border-red-500 focus:ring-red-500' : ''}`}
              />

              {deleteError && (
                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-left animate-in fade-in-50">
                  <div className="flex gap-2">
                    <TrashIcon className="h-5 w-5 text-red-600 shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{deleteError}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => { setDeleteConfirm(null); setDeleteConfirmationName(''); setDeleteError(null); }}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteCustomer(deleteConfirm)}
                  disabled={isLoading || deleteConfirmationName !== customers.find(c => c.id === deleteConfirm)?.name}
                >
                  {isLoading ? 'Deleting...' : 'Delete Customer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );


}
