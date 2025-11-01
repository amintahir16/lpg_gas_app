'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MagnifyingGlassIcon, HomeIcon, PlusIcon, EyeIcon, MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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
    cylindersInMarket: {
      domestic: number;
      standard: number;
      commercial: number;
    };
  };
}

export default function B2CCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<B2CCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalProfit: 0,
    cylindersInMarket: {
      domestic: 0,
      standard: 0,
      commercial: 0
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<B2CCustomer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [marginCategories, setMarginCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearchTerm, pagination.page]);

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
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/customers/b2c?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch B2C customers');
      }
      
      const data: B2CCustomersResponse = await response.json();
      setCustomers(data.customers);
      setPagination(data.pagination);
      setSummary(data.summary);
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

  const handleEditCustomer = (customer: B2CCustomer) => {
    setEditingCustomer(customer);
    setShowEditForm(true);
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

      const updatedCustomer = await response.json();
      console.log('Customer updated successfully:', updatedCustomer);

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

      console.log('Customer deleted successfully');
      setDeleteConfirm(null);
      await fetchCustomers();
      
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/customers')}
              className="mr-4 flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HomeIcon className="w-8 h-8 mr-3 text-green-600" />
            Homes (B2C Customers)
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage home customers, security deposits, and cylinder distribution
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button 
            onClick={() => router.push('/customers/b2c/ledger')}
            variant="outline"
            className="font-semibold"
          >
            View Ledger
          </Button>
          <Button 
            onClick={() => router.push('/customers/b2c/new')}
            className="font-semibold"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HomeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-lg font-bold">₹</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-gray-900">Rs {Number(summary.totalProfit).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-lg font-bold">🔥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Domestic Cylinders</p>
                <p className="text-2xl font-bold text-gray-900">{summary.cylindersInMarket.domestic}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-lg font-bold">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Standard Cylinders</p>
                <p className="text-2xl font-bold text-gray-900">{summary.cylindersInMarket.standard}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 text-lg font-bold">🏭</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Commercial Cylinders</p>
                <p className="text-2xl font-bold text-gray-900">{summary.cylindersInMarket.commercial}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && customers.length === 0 && !error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading B2C customers...</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Search & Filters</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Find specific customers by name, phone, or address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search customers by name, phone, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onFocus={(e) => e.target.select()}
                />
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
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Home Customers</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Complete list of all B2C customers and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                <TableHead className="font-semibold text-gray-700">Address</TableHead>
                <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                <TableHead className="font-semibold text-gray-700">Cylinders</TableHead>
                <TableHead className="font-semibold text-gray-700">Profit</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/customers/b2c/${customer.id}`)}
                >
                  <TableCell>
                    <div>
                      <div className="font-semibold text-gray-900">{customer.name}</div>
                      {customer.email && (
                        <div className="text-sm text-gray-600">{customer.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPinIcon className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="text-gray-700 text-sm">{formatAddress(customer)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700">{customer.phone}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.cylinderHoldings
                        .filter(h => !h.isReturned)
                        .map((holding, index) => (
                        <Badge 
                          key={index}
                          variant={getCylinderTypeColor(holding.cylinderType) as any} 
                          className="text-xs mr-1"
                        >
                          {getCylinderTypeDisplay(holding.cylinderType)} x{holding.quantity}
                        </Badge>
                      ))}
                      {customer.cylinderHoldings.filter(h => !h.isReturned).length === 0 && (
                        <span className="text-gray-500 text-sm">No cylinders</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    Rs {Number(customer.totalProfit).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? 'success' : 'destructive'} className="font-semibold">
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/customers/b2c/${customer.id}`);
                        }}
                        className="font-medium"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCustomer(customer);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(customer.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
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

      {/* Edit B2C Customer Modal */}
      {showEditForm && editingCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit B2C Customer</h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateCustomer({
                  name: formData.get('name'),
                  phone: formData.get('phone'),
                  email: formData.get('email'),
                  address: formData.get('address'),
                  houseNumber: formData.get('houseNumber'),
                  sector: formData.get('sector'),
                  street: formData.get('street'),
                  phase: formData.get('phase'),
                  area: formData.get('area'),
                  city: formData.get('city'),
                  isActive: formData.get('isActive') === 'true',
                  marginCategoryId: formData.get('marginCategoryId')
                });
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                    <Input name="name" type="text" defaultValue={editingCustomer.name} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <Input name="phone" type="tel" defaultValue={editingCustomer.phone} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <Input name="email" type="email" defaultValue={editingCustomer.email || ''} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Margin Category *
                  </label>
                  <Select
                    name="marginCategoryId"
                    required
                    disabled={loadingCategories}
                    defaultValue={editingCustomer.marginCategoryId || ''}
                  >
                    <option value="">{loadingCategories ? "Loading categories..." : "Select margin category"}</option>
                    {marginCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} - Rs {category.marginPerKg}/kg
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <Textarea name="address" rows={3} defaultValue={editingCustomer.address} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">House Number</label>
                    <Input name="houseNumber" type="text" defaultValue={editingCustomer.houseNumber || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sector</label>
                    <Input name="sector" type="text" defaultValue={editingCustomer.sector || ''} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Street</label>
                    <Input name="street" type="text" defaultValue={editingCustomer.street || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phase</label>
                    <Input name="phase" type="text" defaultValue={editingCustomer.phase || ''} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Area</label>
                    <Input name="area" type="text" defaultValue={editingCustomer.area || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                    <Input name="city" type="text" defaultValue={editingCustomer.city} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <Select name="isActive" defaultValue={editingCustomer.isActive ? 'true' : 'false'}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingCustomer(null);
                    }}
                    className="font-medium"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-medium" disabled={isLoading}>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Customer</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this customer? This action cannot be undone.
                The customer will be marked as inactive instead of being permanently deleted.
              </p>
              <div className="flex justify-end space-x-3">
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
                  className="font-medium"
                  disabled={isLoading}
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
