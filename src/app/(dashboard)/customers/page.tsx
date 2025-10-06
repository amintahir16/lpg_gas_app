'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

interface CustomersResponse {
  customers: Customer[];
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

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/customers?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data: CustomersResponse = await response.json();
      setCustomers(data.customers);
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
      default:
        return 'secondary';
    }
  };

  const getCustomerTypeDisplay = (customer: Customer) => {
    // For B2B customers, extract the specific type from notes
    if (customer.type === 'B2B' && customer.notes && customer.notes.includes('Customer Type:')) {
      const type = customer.notes.split('Customer Type: ')[1]?.split(' |')[0];
      return type || 'B2B';
    }
    return customer.type;
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Manage your customer database and relationships
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button 
            onClick={() => router.push('/customers/b2c')}
            variant="outline"
            className="font-semibold"
          >
            B2C Customers
          </Button>
          <Button 
            onClick={() => router.push('/customers/b2b')}
            variant="outline"
            className="font-semibold"
          >
            B2B Customers
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && customers.length === 0 && !error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading customers...</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Search & Filters</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Find specific customers or filter by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search customers..."
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
          <CardTitle className="text-lg font-semibold text-gray-900">Customer Database</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Complete list of all customers and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Name</TableHead>
                <TableHead className="font-semibold text-gray-700">Contact Person</TableHead>
                <TableHead className="font-semibold text-gray-700">Email</TableHead>
                <TableHead className="font-semibold text-gray-700">Phone</TableHead>
                <TableHead className="font-semibold text-gray-700">Type</TableHead>
                <TableHead className="font-semibold text-gray-700">Credit Limit</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/customers/b2b/${customer.id}`)}
                >
                  <TableCell className="font-semibold text-gray-900">{customer.name}</TableCell>
                  <TableCell className="text-gray-700">{customer.contactPerson}</TableCell>
                  <TableCell className="text-gray-700">{customer.email || '-'}</TableCell>
                  <TableCell className="text-gray-700">{customer.phone}</TableCell>
                  <TableCell>
                    <Badge variant={getCustomerTypeColor(customer.type) as any} className="font-semibold">
                      {getCustomerTypeDisplay(customer)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    Rs {(Number(customer.creditLimit) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? 'success' : 'destructive'} className="font-semibold">
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
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

    </div>
  );
} 