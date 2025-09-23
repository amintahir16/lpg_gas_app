'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ArrowLeftIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

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
}

interface B2BCustomersResponse {
  customers: B2BCustomer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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
    fetchB2BCustomers();
  }, [debouncedSearchTerm, pagination.page]);

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

  const fetchB2BCustomers = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        type: 'B2B'
      });

      console.log('Fetching B2B customers with params:', params.toString());
      const response = await fetch(`/api/customers/b2b?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch B2B customers: ${response.status}`);
      }
      
      const data: B2BCustomersResponse = await response.json();
      console.log('Fetched B2B customers:', data);
      
      setCustomers(data.customers || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (err) {
      console.error('Error fetching B2B customers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCustomers([]); // Ensure customers array is cleared on error
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

  const getTotalCylindersDue = (customer: B2BCustomer) => {
    return customer.domestic118kgDue + customer.standard15kgDue + customer.commercial454kgDue;
  };

  const handleAddCustomer = async (formData: any) => {
    try {
      setError(null); // Clear any previous errors
      
      const response = await fetch('/api/customers/b2b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type: 'B2B'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create B2B customer');
      }

      const newCustomer = await response.json();
      console.log('Customer created successfully:', newCustomer);

      // Close the form first
      setShowAddForm(false);
      
      // Reset pagination to page 1 to see the new customer
      setPagination(prev => ({ ...prev, page: 1 }));
      
      // Refresh the customers list
      await fetchB2BCustomers();
      
    } catch (err) {
      console.error('Error creating customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    }
  };

  // Only show loading screen on initial load
  if (loading && customers.length === 0 && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading B2B customers...</p>
        </div>
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
              onClick={() => router.push('/customers')}
              className="mr-4 flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="w-8 h-8 mr-3 text-blue-600" />
            Industries & Restaurants (B2B)
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage B2B customers, cylinder dues, and account receivables
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button 
            onClick={fetchB2BCustomers}
            variant="outline"
            disabled={loading}
            className="font-semibold"
          >
            <MagnifyingGlassIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add B2B Customer
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Search & Filters</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Find specific B2B customers or filter by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search B2B customers..."
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

      {/* B2B Customers Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">B2B Customer Database</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Complete list of all B2B customers with cylinder dues and account receivables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && customers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading customers...</p>
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No B2B Customers Found</h3>
                <p className="text-gray-600 mb-4">
                  {debouncedSearchTerm 
                    ? `No customers found matching "${debouncedSearchTerm}"` 
                    : 'Start by adding your first B2B customer'
                  }
                </p>
                {!debouncedSearchTerm && (
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add First Customer
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700">Contact</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Cylinder 11.8kg</TableHead>
                  <TableHead className="font-semibold text-gray-700">Cylinder 15kg</TableHead>
                  <TableHead className="font-semibold text-gray-700">Cylinder 45.4kg</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Due</TableHead>
                  <TableHead className="font-semibold text-gray-700">Account Receivables</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/customers/b2b/${customer.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-semibold text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.contactPerson}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-gray-700">{customer.phone}</p>
                      {customer.email && (
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className="font-semibold"
                    >
                      {customer.notes && customer.notes.includes('Customer Type:') 
                        ? customer.notes.split('Customer Type: ')[1]?.split(' |')[0] || 'B2B'
                        : 'B2B'
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={customer.domestic118kgDue > 0 ? 'destructive' : 'secondary'}
                      className="font-semibold"
                    >
                      {customer.domestic118kgDue}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={customer.standard15kgDue > 0 ? 'destructive' : 'secondary'}
                      className="font-semibold"
                    >
                      {customer.standard15kgDue}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={customer.commercial454kgDue > 0 ? 'destructive' : 'secondary'}
                      className="font-semibold"
                    >
                      {customer.commercial454kgDue}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CubeIcon className="w-4 h-4 mr-1 text-gray-500" />
                      <span className="font-semibold text-gray-900">
                        {getTotalCylindersDue(customer)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="w-4 h-4 mr-1 text-gray-500" />
                      <span className={`font-semibold ${
                        customer.ledgerBalance > 0 ? 'text-red-600' : 
                        customer.ledgerBalance < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {formatCurrency(customer.ledgerBalance)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? 'success' : 'destructive'} className="font-semibold">
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/customers/b2b/${customer.id}`);
                      }}
                      className="font-medium"
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {customers.length > 0 && pagination.pages > 1 && (
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

      {/* Add B2B Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New B2B Customer</h3>
              <form className="space-y-4" onSubmit={(e) => {
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
                  customerType: formData.get('customerType')
                });
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                  <Input name="name" type="text" placeholder="Company Name" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Type</label>
                  <select 
                    name="customerType" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Customer Type</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="RESTAURANT">Restaurant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                  <Input name="contactPerson" type="text" placeholder="Contact Person" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <Input name="email" type="email" placeholder="Email" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <Input name="phone" type="tel" placeholder="Phone" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <Input name="address" type="text" placeholder="Address" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Limit</label>
                  <Input name="creditLimit" type="number" placeholder="0.00" step="0.01" defaultValue="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Terms (Days)</label>
                  <Input name="paymentTermsDays" type="number" placeholder="30" defaultValue="30" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <Input name="notes" type="text" placeholder="Notes" />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="font-medium"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-medium">
                    Add Customer
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
