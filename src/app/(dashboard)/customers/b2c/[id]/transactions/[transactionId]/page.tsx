'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HomeIcon, ArrowLeftIcon, PrinterIcon, CalendarIcon, ClockIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';

interface B2CCustomer {
  id: string;
  name: string;
  address: string;
  houseNumber: string | null;
  sector: string | null;
  street: string | null;
  phase: string | null;
  area: string | null;
  city: string;
  phone: string;
}

interface B2CTransaction {
  id: string;
  billSno: string;
  date: string;
  time: string;
  totalAmount: number;
  deliveryCharges: number;
  finalAmount: number;
  paymentMethod: string;
  notes: string | null;
  customer: B2CCustomer;
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
}

export default function B2CTransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const transactionId = params.transactionId as string;

  const [transaction, setTransaction] = useState<B2CTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails();
    }
  }, [transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/b2c/transactions/${transactionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }
      
      const data = await response.json();
      setTransaction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/customers/b2c/${customerId}`)}
            className="mr-4 flex items-center"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Customer
          </Button>
        </div>
        <Card className="border-0 shadow-sm bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-red-700 font-medium">{error || 'Transaction not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gasTotal = transaction.gasItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const securityTotal = transaction.securityItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const accessoryTotal = transaction.accessoryItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const subtotal = gasTotal + securityTotal + accessoryTotal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/customers/b2c/${customerId}`)}
              className="mr-4 flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Customer
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ReceiptPercentIcon className="w-8 h-8 mr-3 text-blue-600" />
            Transaction Details
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Bill No: {transaction.billSno}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="font-semibold"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Customer Information */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <HomeIcon className="w-5 h-5 mr-2 text-green-600" />
            Customer Home: {formatAddress(transaction.customer)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Customer Name:</p>
              <p className="font-semibold text-gray-900">{transaction.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone:</p>
              <p className="font-semibold text-gray-900">{transaction.customer.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Information */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
            Transaction Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Date:</p>
              <p className="font-semibold text-gray-900" suppressHydrationWarning>{new Date(transaction.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time:</p>
              <p className="font-semibold text-gray-900" suppressHydrationWarning>{new Date(transaction.time).toLocaleTimeString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bill SNo:</p>
              <p className="font-semibold text-gray-900">{transaction.billSno}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Method:</p>
              <Badge variant="success" className="font-semibold">
                {transaction.paymentMethod}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gas Section */}
      {transaction.gasItems.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Gas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Gas Cylinder</TableHead>
                  <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Price Per Item</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Price per Item</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.gasItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-semibold text-gray-900">
                      {getCylinderTypeDisplay(item.cylinderType)}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>Rs {Number(item.pricePerItem).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">Rs {Number(item.totalPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="font-bold text-gray-900 text-right">
                    Total =
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">
                    Rs {Number(gasTotal).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Security Deposit Section */}
      {transaction.securityItems.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Security Deposit</CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              When the customer is giving us back the cylinder and wants the security back, we deduct 25% from the security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Security Deposit Cylinder</TableHead>
                  <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Price Per Item</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Price per Item</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.securityItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-semibold text-gray-900">
                      {getCylinderTypeDisplay(item.cylinderType)}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>Rs {Number(item.pricePerItem).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">Rs {Number(item.totalPrice).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.isReturn ? 'warning' : 'success'} className="font-semibold">
                        {item.isReturn ? 'Return (25% off)' : 'New Deposit'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="font-bold text-gray-900 text-right">
                    Total =
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">
                    Rs {Number(securityTotal).toFixed(2)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Accessories Section */}
      {transaction.accessoryItems.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Accessories</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Item Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Price Per Item</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Price per Item</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.accessoryItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-semibold text-gray-900">{item.itemName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>Rs {Number(item.pricePerItem).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">Rs {Number(item.totalPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="font-bold text-gray-900 text-right">
                    Total =
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">
                    Rs {Number(accessoryTotal).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Total Amount Section */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-green-600" />
            Total Amount Calculation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gas Total:</span>
                  <span className="font-semibold">Rs {gasTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Total:</span>
                  <span className="font-semibold">Rs {Number(securityTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accessories Total:</span>
                  <span className="font-semibold">Rs {Number(accessoryTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-900 font-medium">Subtotal:</span>
                  <span className="font-bold">Rs {Number(subtotal).toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Charges:</span>
                  <span className="font-semibold">Rs {Number(transaction.deliveryCharges).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t-2 pt-2">
                  <span className="text-xl font-bold text-gray-900">Total Amount Due:</span>
                  <span className="text-2xl font-bold text-green-600">Rs {Number(transaction.finalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {transaction.notes && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Notes:</p>
                <p className="text-gray-900">{transaction.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
