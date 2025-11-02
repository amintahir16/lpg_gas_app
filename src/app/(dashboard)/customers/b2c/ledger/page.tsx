'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HomeIcon, ArrowLeftIcon, MapPinIcon, EyeIcon } from '@heroicons/react/24/outline';

interface B2CCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  houseNumber: string | null;
  sector: string | null;
  street: string | null;
  phase: string | null;
  area: string | null;
  city: string;
  totalProfit: number;
}

interface B2CLedgerResponse {
  customers: B2CCustomer[];
  totalProfit: number;
  totalCustomers: number;
}

export default function B2CLedgerPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<B2CCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalProfit: 0,
    totalCustomers: 0
  });

  useEffect(() => {
    fetchLedgerData();
  }, []);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customers/b2c/ledger');
      
      if (!response.ok) {
        throw new Error('Failed to fetch B2C ledger data');
      }
      
      const data: B2CLedgerResponse = await response.json();
      setCustomers(data.customers);
      setSummary({
        totalProfit: data.totalProfit,
        totalCustomers: data.totalCustomers
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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

  const handleViewCustomer = (customerId: string) => {
    router.push(`/customers/b2c/${customerId}`);
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
              onClick={() => router.push('/customers/b2c')}
              className="mr-4 flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to B2C Customers
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HomeIcon className="w-8 h-8 mr-3 text-green-600" />
            B2C Homes Ledger
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Complete profit tracking for all home customers
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Profit Summary</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                Rs {Number(summary.totalProfit).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                From {summary.totalCustomers} customers
              </p>
            </div>
            <div className="text-right">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-green-600 text-2xl font-bold">₹</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading ledger data...</p>
          </div>
        </div>
      )}

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

      {/* Customer Profit Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Individual Home Profits</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Profit breakdown by customer address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Customer Name</TableHead>
                <TableHead className="font-semibold text-gray-700">Home Address</TableHead>
                <TableHead className="font-semibold text-gray-700">Contact</TableHead>
                <TableHead className="font-semibold text-gray-700">Profit</TableHead>
                <TableHead className="font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className="hover:bg-gray-50"
                >
                  <TableCell className="font-semibold text-gray-900">
                    {customer.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPinIcon className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="text-gray-700 text-sm">{formatAddress(customer)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700">{customer.phone}</TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    Rs {Number(customer.totalProfit).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCustomer(customer.id)}
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {customers.length === 0 && !loading && (
            <div className="text-center py-12">
              <HomeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No B2C customers found</h3>
              <p className="text-gray-600 mb-4">Start by adding your first home customer</p>
              <Button 
                onClick={() => router.push('/customers/b2c/new')}
                className="font-semibold"
              >
                Add First Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
