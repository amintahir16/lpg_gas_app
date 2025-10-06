'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HomeIcon, ArrowLeftIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, PlusIcon, CalendarIcon, EyeIcon } from '@heroicons/react/24/outline';

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
      itemName: string;
      quantity: number;
      pricePerItem: number;
      totalPrice: number;
    }[];
  }[];
}

export default function B2CCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<B2CCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/b2c/${customerId}`);
      
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
  const totalSecurityAmount = activeCylinders.reduce((sum, h) => sum + Number(h.securityAmount), 0);

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
                <p className="text-2xl font-bold text-gray-900">{activeCylinders.length}</p>
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
                      <p className="text-sm text-gray-600 mt-1">
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
          <CardTitle className="text-lg font-semibold text-gray-900">Transaction History</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Complete transaction history for this customer
          </CardDescription>
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
                      <div>
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
                        {transaction.accessoryItems.length > 0 && (
                          <Badge variant="secondary" className="text-xs mr-1">
                            Accessories x{transaction.accessoryItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </Badge>
                        )}
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
