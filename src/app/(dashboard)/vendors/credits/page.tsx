"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CreditCardIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface VendorCredit {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalPurchases: number;
  totalPayments: number;
  creditBalance: number;
  outstandingBalance: number;
  purchaseCount: number;
  hasCredit: boolean;
  hasOutstanding: boolean;
}

interface CreditSummary {
  totalVendors: number;
  vendorsWithCredits: number;
  vendorsWithOutstanding: number;
  totalCreditBalance: number;
  totalOutstandingBalance: number;
  netPosition: number;
}

export default function VendorCreditsPage() {
  const { data: session, status } = useSession();
  const [vendors, setVendors] = useState<VendorCredit[]>([]);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credits' | 'outstanding'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVendorCredits();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const fetchVendorCredits = async () => {
    try {
      const response = await fetch('/api/vendors/credits');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch vendor credits`);
      }
      const data = await response.json();
      setVendors(data.vendors || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching vendor credits:', error);
      // Set empty data on error to prevent further issues
      setVendors([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesFilter = filter === 'all' || 
      (filter === 'credits' && vendor.hasCredit) ||
      (filter === 'outstanding' && vendor.hasOutstanding);
    
    const matchesSearch = (vendor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.phone || '').includes(searchTerm);
    
    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading vendor credits...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Login Required
            </h3>
            <p className="text-gray-500">
              Please log in to access the vendor credit management system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/vendors">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Vendors
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Credit Management</h1>
        <p className="text-gray-600">
          Track and manage vendor credit balances and outstanding payments.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credit Balance</CardTitle>
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalCreditBalance)}
              </div>
              <p className="text-xs text-gray-500">
                {summary.vendorsWithCredits} vendors owe you money
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalOutstandingBalance)}
              </div>
              <p className="text-xs text-gray-500">
                {summary.vendorsWithOutstanding} vendors need payment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
              <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(summary.netPosition))}
              </div>
              <p className="text-xs text-gray-500">
                {summary.netPosition >= 0 ? 'Net credit position' : 'Net outstanding position'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summary.totalVendors}
              </div>
              <p className="text-xs text-gray-500">
                Active vendor accounts
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Vendors
          </Button>
          <Button
            variant={filter === 'credits' ? 'default' : 'outline'}
            onClick={() => setFilter('credits')}
          >
            With Credits ({summary?.vendorsWithCredits || 0})
          </Button>
          <Button
            variant={filter === 'outstanding' ? 'default' : 'outline'}
            onClick={() => setFilter('outstanding')}
          >
            Outstanding ({summary?.vendorsWithOutstanding || 0})
          </Button>
        </div>
        <Input
          placeholder="Search vendors by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Vendors List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{vendor.name || 'Unnamed Vendor'}</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {vendor.phone && (
                      <div className="flex items-center gap-1">
                        <PhoneIcon className="h-4 w-4" />
                        {vendor.phone}
                      </div>
                    )}
                  </div>
                  {vendor.address && (
                    <div className="flex items-start gap-1 mt-1 text-sm text-gray-500">
                      <MapPinIcon className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{vendor.address}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {vendor.hasCredit ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Credit
                    </Badge>
                  ) : vendor.hasOutstanding ? (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                      Outstanding
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      Balanced
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Purchases:</span>
                  <span className="font-medium">{formatCurrency(Math.round(vendor.totalPurchases))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Payments:</span>
                  <span className="font-medium">{formatCurrency(Math.round(vendor.totalPayments))}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Balance:</span>
                    <span className={vendor.hasCredit ? 'text-green-600' : vendor.hasOutstanding ? 'text-red-600' : 'text-gray-600'}>
                      {vendor.hasCredit ? '+' : ''}{formatCurrency(Math.round(vendor.outstandingBalance))}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {vendor.hasCredit 
                      ? `${formatCurrency(Math.round(vendor.creditBalance))} credit (vendor owes you)`
                      : vendor.hasOutstanding
                      ? `${formatCurrency(Math.round(vendor.outstandingBalance))} outstanding (you owe vendor)`
                      : 'Fully balanced'
                    }
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-gray-500">
                    {vendor.purchaseCount} purchase{vendor.purchaseCount !== 1 ? 's' : ''}
                  </span>
                  <Link href={`/vendors/${vendor.id}`}>
                    <Button size="sm" variant="outline">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCardIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No vendors found
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'No vendors match the current filter.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
