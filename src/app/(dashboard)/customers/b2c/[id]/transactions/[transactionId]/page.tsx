'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HomeIcon, ArrowLeftIcon, PrinterIcon, CalendarIcon, ClockIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

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
  totalCost: number;
  deliveryCost: number;
  actualProfit: number;
  paymentMethod: string;
  notes: string | null;
  customer: B2CCustomer;
  gasItems: {
    cylinderType: string;
    quantity: number;
    pricePerItem: number;
    totalPrice: number;
    costPrice: number;
    totalCost: number;
    profitMargin: number;
  }[];
  securityItems: {
    cylinderType: string;
    quantity: number;
    pricePerItem: number;
    totalPrice: number;
    isReturn: boolean;
    deductionRate: number;
  }[];
  accessoryItems: {
    productName: string;
    quantity: number;
    pricePerItem: number;
    totalPrice: number;
    costPrice: number;
    totalCost: number;
    profitMargin: number;
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
    return getCylinderTypeDisplayName(type);
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

      {/* Items Section - Combined Gas and Accessories */}
      {(transaction.gasItems.length > 0 || transaction.accessoryItems.length > 0) && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Item</TableHead>
                  <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Selling Price</TableHead>
                  <TableHead className="font-semibold text-gray-700">Cost Price</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Revenue</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Cost</TableHead>
                  <TableHead className="font-semibold text-gray-700">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Gas Items */}
                {transaction.gasItems.map((item, index) => (
                  <TableRow key={`gas-${index}`}>
                    <TableCell className="font-semibold text-gray-900">
                      {getCylinderTypeDisplay(item.cylinderType)}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>Rs {Number(item.pricePerItem).toFixed(2)}</TableCell>
                    <TableCell>Rs {Number(item.costPrice).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">Rs {Number(item.totalPrice).toFixed(2)}</TableCell>
                    <TableCell>Rs {Number(item.totalCost).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      Rs {Number(item.profitMargin).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Accessory Items */}
                {transaction.accessoryItems.map((item, index) => (
                  <TableRow key={`accessory-${index}`}>
                    <TableCell className="font-semibold text-gray-900">{item.productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>Rs {Number(item.pricePerItem).toFixed(2)}</TableCell>
                    <TableCell>Rs {Number(item.costPrice).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">Rs {Number(item.totalPrice).toFixed(2)}</TableCell>
                    <TableCell>Rs {Number(item.totalCost).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      Rs {Number(item.profitMargin).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={4} className="font-bold text-gray-900 text-right">
                    Total =
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">
                    Rs {(gasTotal + accessoryTotal).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">
                    Rs {(
                      transaction.gasItems.reduce((sum, item) => sum + Number(item.totalCost), 0) +
                      transaction.accessoryItems.reduce((sum, item) => sum + Number(item.totalCost), 0)
                    ).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-bold text-green-600">
                    Rs {(
                      transaction.gasItems.reduce((sum, item) => sum + Number(item.profitMargin), 0) +
                      transaction.accessoryItems.reduce((sum, item) => sum + Number(item.profitMargin), 0)
                    ).toFixed(2)}
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

      {/* Profit Breakdown Section */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <ReceiptPercentIcon className="w-5 h-5 mr-2 text-green-600" />
            Profit Breakdown
          </CardTitle>
          <CardDescription className="text-gray-600">
            Detailed analysis of revenue, costs, and actual profit margins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue Column */}
            <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">Revenue</h4>
              <div className="flex justify-between">
                <span className="text-blue-700">Gas Sales:</span>
                <span className="font-semibold text-blue-700">Rs {gasTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Accessory Sales:</span>
                <span className="font-semibold text-blue-700">Rs {Number(accessoryTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Delivery Charges:</span>
                <span className="font-semibold text-blue-700">Rs {Number(transaction.deliveryCharges).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-blue-900">Total Revenue:</span>
                <span className="font-bold text-blue-900">Rs {Number(transaction.finalAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Cost Column */}
            <div className="space-y-2 bg-red-50 p-3 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-3">Costs</h4>
              <div className="flex justify-between">
                <span className="text-red-700">Gas Cost:</span>
                <span className="font-semibold text-red-700">Rs {transaction.gasItems.reduce((sum, item) => sum + Number(item.totalCost), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700">Accessory Cost:</span>
                <span className="font-semibold text-red-700">Rs {transaction.accessoryItems.reduce((sum, item) => sum + Number(item.totalCost), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700">Delivery Cost:</span>
                <span className="font-semibold text-red-700">Rs {Number(transaction.deliveryCost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-red-900">Total Cost:</span>
                <span className="font-bold text-red-900">Rs {Number(transaction.totalCost).toFixed(2)}</span>
              </div>
            </div>

            {/* Profit Column */}
            <div className="space-y-2 bg-green-50 p-3 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-3">Profit Margin</h4>
              <div className="flex justify-between">
                <span className="text-green-700">Gas Profit:</span>
                <span className="font-semibold text-green-700">Rs {transaction.gasItems.reduce((sum, item) => sum + Number(item.profitMargin), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Accessory Profit:</span>
                <span className="font-semibold text-green-700">Rs {transaction.accessoryItems.reduce((sum, item) => sum + Number(item.profitMargin), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Delivery Profit:</span>
                <span className="font-semibold text-green-700">Rs {(Number(transaction.deliveryCharges) - Number(transaction.deliveryCost)).toFixed(2)}</span>
              </div>
              {transaction.securityItems.some(item => item.isReturn) && (
                <div className="flex justify-between">
                  <span className="text-green-700">Security Deduction (25%):</span>
                  <span className="font-semibold text-green-700">
                    Rs {transaction.securityItems.reduce((sum, item) => {
                      if (item.isReturn) {
                        const originalSecurity = item.pricePerItem / 0.75;
                        const deduction = originalSecurity * 0.25;
                        return sum + (deduction * item.quantity);
                      }
                      return sum;
                    }, 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-green-900">Actual Profit:</span>
                <span className="font-bold text-green-900">Rs {Number(transaction.actualProfit).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
