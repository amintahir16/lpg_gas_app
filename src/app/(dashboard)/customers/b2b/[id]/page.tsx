'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CubeIcon
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

interface B2BTransaction {
  id: string;
  transactionType: string;
  billSno: string;
  date: string;
  time: string;
  totalAmount: number;
  paymentReference: string | null;
  notes: string | null;
  voided: boolean;
  items: B2BTransactionItem[];
}

interface B2BTransactionItem {
  id: string;
  productName: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  cylinderType: string | null;
  returnedCondition: string | null;
  remainingKg: number | null;
  originalSoldPrice: number | null;
  buybackRate: number | null;
  buybackPricePerItem: number | null;
  buybackTotal: number | null;
}

interface CustomerLedgerResponse {
  customer: B2BCustomer;
  transactions: B2BTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function B2BCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<B2BCustomer | null>(null);
  const [transactions, setTransactions] = useState<B2BTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Transaction form states
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'SALE' | 'PAYMENT' | 'BUYBACK' | 'RETURN_EMPTY'>('SALE');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionTime, setTransactionTime] = useState(new Date().toTimeString().slice(0, 5));
  
  // Payment form states
  const [paymentAgainst, setPaymentAgainst] = useState('');
  const [paymentQuantity, setPaymentQuantity] = useState(0);

  // Gas transaction form data
  const [gasItems, setGasItems] = useState([
    { cylinderType: 'DOMESTIC_11_8KG', delivered: 0, pricePerItem: 0, emptyReturned: 0, remainingDue: 0, remainingKg: 0, originalSoldPrice: 0, buybackRate: 0.6, buybackPricePerItem: 0, buybackTotal: 0 },
    { cylinderType: 'STANDARD_15KG', delivered: 0, pricePerItem: 0, emptyReturned: 0, remainingDue: 0, remainingKg: 0, originalSoldPrice: 0, buybackRate: 0.6, buybackPricePerItem: 0, buybackTotal: 0 },
    { cylinderType: 'COMMERCIAL_45_4KG', delivered: 0, pricePerItem: 0, emptyReturned: 0, remainingDue: 0, remainingKg: 0, originalSoldPrice: 0, buybackRate: 0.6, buybackPricePerItem: 0, buybackTotal: 0 }
  ]);
  
  // Pricing information
  const [pricingInfo, setPricingInfo] = useState<any>(null);

  // Accessories transaction form data
  const [accessoryItems, setAccessoryItems] = useState([
    { name: 'Gas Pipe (ft)', quantity: 0, pricePerItem: 0, quality: '' },
    { name: 'Stove', quantity: 0, pricePerItem: 0, quality: '' },
    { name: 'Regulator Adjustable', quantity: 0, pricePerItem: 0, quality: '' },
    { name: 'Regulator Ideal High Pressure', quantity: 0, pricePerItem: 0, quality: '' },
    { name: 'Regulator 5 Star High Pressure', quantity: 0, pricePerItem: 0, quality: '' },
    { name: 'Regulator 3 Star Low Pressure Q1', quantity: 0, pricePerItem: 0, quality: '' },
    { name: 'Regulator 3 Star Low Pressure Q2', quantity: 0, pricePerItem: 0, quality: '' }
  ]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerLedger();
    }
  }, [customerId, pagination.page]);


  // Update gas items with current cylinder dues when customer data loads
  useEffect(() => {
    if (customer) {
      setGasItems(prevItems => 
        prevItems.map(item => ({
          ...item,
          remainingDue: getCurrentCylinderDue(item.cylinderType)
        }))
      );
    }
  }, [customer]);

  // Update remaining due calculation when transaction type changes
  useEffect(() => {
    if (customer) {
      setGasItems(prevItems => 
        prevItems.map(item => {
          const currentDue = getCurrentCylinderDue(item.cylinderType);
          let newRemainingDue = currentDue;
          
          if (transactionType === 'SALE') {
            // For sales: add delivered cylinders to current due
            newRemainingDue = currentDue + (item.delivered || 0);
          } else if (transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') {
            // For returns: subtract returned cylinders from current due
            newRemainingDue = Math.max(0, currentDue - (item.emptyReturned || 0));
          }
          
          return {
            ...item,
            remainingDue: newRemainingDue
          };
        })
      );
    }
  }, [transactionType, customer]);


  const fetchCustomerLedger = async () => {
    try {
      setLoading(true);
      console.log('Fetching customer ledger for customer:', customerId);
      const response = await fetch(`/api/customers/b2b/${customerId}/ledger?page=${pagination.page}&limit=${pagination.limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer ledger');
      }
      
      const data: CustomerLedgerResponse = await response.json();
      console.log('Customer ledger data:', data);
      console.log('Customer ledger balance:', data.customer.ledgerBalance);
      console.log('Transactions count:', data.transactions.length);
      setCustomer(data.customer);
      setTransactions(data.transactions);
      setPagination(data.pagination);
      
      // Fetch calculated prices for this customer
      await fetchCalculatedPrices();
    } catch (err) {
      console.error('Error fetching customer ledger:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalculatedPrices = async () => {
    try {
      const response = await fetch(`/api/pricing/calculate?customerId=${customerId}&customerType=B2B`);
      
      if (response.ok) {
        const pricingData = await response.json();
        setPricingInfo(pricingData);
      }
    } catch (error) {
      console.error('Error fetching calculated prices:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK');
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-PK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateBuybackAmount = (originalPrice: number, remainingKg: number, totalKg: number) => {
    const buybackRate = 0.6; // 60% of original price
    const remainingPercentage = remainingKg / totalKg;
    return originalPrice * remainingPercentage * buybackRate;
  };

  const updateGasItem = (index: number, field: string, value: any) => {
    const newItems = [...gasItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-apply calculated price when delivered quantity is set
    if (field === 'delivered' && value > 0 && pricingInfo) {
      const cylinderType = newItems[index].cylinderType;
      let calculatedPrice = 0;
      
      switch (cylinderType) {
        case 'DOMESTIC_11_8KG':
          calculatedPrice = pricingInfo.finalPrices.domestic118kg;
          break;
        case 'STANDARD_15KG':
          calculatedPrice = pricingInfo.finalPrices.standard15kg;
          break;
        case 'COMMERCIAL_45_4KG':
          calculatedPrice = pricingInfo.finalPrices.commercial454kg;
          break;
      }
      
      if (calculatedPrice > 0) {
        newItems[index].pricePerItem = calculatedPrice;
      }
    }
    
    // Calculate buyback if it's a buyback transaction
    if (transactionType === 'BUYBACK') {
      if (newItems[index].remainingKg > 0 && newItems[index].originalSoldPrice > 0) {
        const totalKg = newItems[index].cylinderType === 'DOMESTIC_11_8KG' ? 11.8 :
                       newItems[index].cylinderType === 'STANDARD_15KG' ? 15 : 45.4;
        const buybackAmount = calculateBuybackAmount(newItems[index].originalSoldPrice, newItems[index].remainingKg, totalKg);
        newItems[index].buybackPricePerItem = buybackAmount;
        newItems[index].buybackTotal = buybackAmount * (newItems[index].emptyReturned || 0);
      } else {
        // Reset buyback amounts if conditions not met
        newItems[index].buybackPricePerItem = 0;
        newItems[index].buybackTotal = 0;
      }
    }
    
    // Calculate remaining cylinders due based on transaction type
    if (customer) {
      const currentDue = getCurrentCylinderDue(newItems[index].cylinderType);
      let newRemainingDue = currentDue;
      
      if (transactionType === 'SALE') {
        // For sales: add delivered cylinders to current due
        newRemainingDue = currentDue + (newItems[index].delivered || 0);
      } else if (transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') {
        // For returns: subtract returned cylinders from current due
        newRemainingDue = Math.max(0, currentDue - (newItems[index].emptyReturned || 0));
      }
      
      newItems[index].remainingDue = newRemainingDue;
    }
    
    setGasItems(newItems);
  };

  const applyCalculatedPrices = () => {
    if (!pricingInfo) return;
    
    const updatedItems = gasItems.map(item => {
      let calculatedPrice = 0;
      
      switch (item.cylinderType) {
        case 'DOMESTIC_11_8KG':
          calculatedPrice = pricingInfo.finalPrices.domestic118kg;
          break;
        case 'STANDARD_15KG':
          calculatedPrice = pricingInfo.finalPrices.standard15kg;
          break;
        case 'COMMERCIAL_45_4KG':
          calculatedPrice = pricingInfo.finalPrices.commercial454kg;
          break;
      }
      
      return {
        ...item,
        pricePerItem: calculatedPrice > 0 ? calculatedPrice : item.pricePerItem
      };
    });
    
    setGasItems(updatedItems);
  };

  const getCurrentCylinderDue = (cylinderType: string) => {
    if (!customer) return 0;
    
    switch (cylinderType) {
      case 'DOMESTIC_11_8KG':
        return customer.domestic118kgDue || 0;
      case 'STANDARD_15KG':
        return customer.standard15kgDue || 0;
      case 'COMMERCIAL_45_4KG':
        return customer.commercial454kgDue || 0;
      default:
        return 0;
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Calculate total amount based on transaction type
      let totalAmount = 0;
      if (transactionType === 'SALE') {
        totalAmount = gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0) +
                     accessoryItems.reduce((sum, item) => sum + (item.quantity * item.pricePerItem), 0);
      } else if (transactionType === 'BUYBACK') {
        totalAmount = gasItems.reduce((sum, item) => sum + item.buybackTotal, 0);
      } else if (transactionType === 'PAYMENT') {
        totalAmount = parseFloat(formData.get('paymentAmount') as string) || 0;
      }

      // Create payment item for PAYMENT transactions
      const paymentItem = transactionType === 'PAYMENT' && paymentAgainst ? {
        productName: paymentQuantity > 0 
          ? `${paymentAgainst.replace(/_/g, ' ').replace(/\./g, '.').replace(/KG/g, 'kg')} x${paymentQuantity}`
          : paymentAgainst.replace(/_/g, ' ').replace(/\./g, '.').replace(/KG/g, 'kg'),
        quantity: paymentQuantity > 0 ? paymentQuantity : 1,
        pricePerItem: paymentQuantity > 0 ? totalAmount / paymentQuantity : totalAmount,
        totalPrice: totalAmount,
        cylinderType: paymentAgainst.includes('KG') ? paymentAgainst : null
      } : null;

      const transactionData = {
        transactionType,
        customerId,
        date: transactionDate,
        time: transactionTime,
        totalAmount,
        paymentReference: formData.get('paymentReference'),
        notes: formData.get('notes'),
        paymentAgainst: transactionType === 'PAYMENT' ? formData.get('paymentAgainst') : null,
        paymentDescription: transactionType === 'PAYMENT' ? formData.get('paymentDescription') : null,
        paymentQuantity: transactionType === 'PAYMENT' ? paymentQuantity : null,
        gasItems: transactionType === 'PAYMENT' ? [] : gasItems.filter(item => item.delivered > 0 || item.emptyReturned > 0),
        accessoryItems: transactionType === 'PAYMENT' ? (paymentItem ? [paymentItem] : []) : accessoryItems.filter(item => item.quantity > 0)
      };

      const response = await fetch('/api/customers/b2b/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create transaction');
      }

      const result = await response.json();
      console.log('Transaction created successfully:', result);

      // Reset form and refresh data
      setShowTransactionForm(false);
      setGasItems(gasItems.map(item => ({ ...item, delivered: 0, emptyReturned: 0 })));
      setAccessoryItems(accessoryItems.map(item => ({ ...item, quantity: 0, quality: '' })));
      
      // Reset payment form states
      setPaymentAgainst('');
      setPaymentQuantity(0);
      
      // Refresh customer data multiple times to ensure it's updated
      await fetchCustomerLedger();
      
      // Force refresh after short delay
      setTimeout(async () => {
        console.log('Force refreshing customer data...');
        await fetchCustomerLedger();
      }, 1000);
      
      // Another refresh after longer delay
      setTimeout(async () => {
        console.log('Final refresh of customer data...');
        await fetchCustomerLedger();
      }, 2000);
      
      alert('Transaction created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    }
  };

  if (loading && !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Customer not found</p>
          <Button 
            onClick={() => router.push('/customers/b2b')}
            className="mt-4"
          >
            Back to B2B Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push('/customers/b2b')}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to B2B Customers
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="w-8 h-8 mr-3 text-blue-600" />
            {customer.name}
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            Account Receivables & Transaction History
          </p>
        </div>
      </div>

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

      {/* Customer Info & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <Card className="lg:col-span-2 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Contact Person</p>
                <p className="text-lg font-semibold text-gray-900">{customer.contactPerson}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-lg font-semibold text-gray-900">{customer.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-lg font-semibold text-gray-900">{customer.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                <p className="text-lg font-semibold text-gray-900">{customer.paymentTermsDays} days</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-lg font-semibold text-gray-900">{customer.address || '-'}</p>
              </div>
              {customer.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Summary & Quick Actions */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ledger Balance */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Account Receivables</p>
              <p className={`text-3xl font-bold flex items-center justify-center ${
                customer.ledgerBalance > 0 ? 'text-red-600' : 
                customer.ledgerBalance < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                <CurrencyDollarIcon className="w-6 h-6 mr-2" />
                {formatCurrency(customer.ledgerBalance)}
              </p>
            </div>

            {/* Cylinders Due */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Remaining Cylinders Due</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Domestic (11.8kg)</span>
                  <Badge variant={customer.domestic118kgDue > 0 ? 'destructive' : 'secondary'}>
                    {customer.domestic118kgDue}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Standard (15kg)</span>
                  <Badge variant={customer.standard15kgDue > 0 ? 'destructive' : 'secondary'}>
                    {customer.standard15kgDue}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Commercial (45.4kg)</span>
                  <Badge variant={customer.commercial454kgDue > 0 ? 'destructive' : 'secondary'}>
                    {customer.commercial454kgDue}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setTransactionType('SALE');
                  setShowTransactionForm(true);
                }}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                New Sale
              </Button>
              <Button
                onClick={() => {
                  setTransactionType('PAYMENT');
                  setShowTransactionForm(true);
                }}
                variant="outline"
                className="w-full"
              >
                <CreditCardIcon className="w-4 h-4 mr-2" />
                New Payment
              </Button>
              <Button
                onClick={() => {
                  setTransactionType('BUYBACK');
                  setShowTransactionForm(true);
                }}
                variant="outline"
                className="w-full"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Gas Buyback
              </Button>
              <Button
                onClick={() => {
                  setTransactionType('RETURN_EMPTY');
                  setShowTransactionForm(true);
                }}
                variant="outline"
                className="w-full"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Return Empty
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {transactionType === 'SALE' ? 'New Sale Transaction' :
                 transactionType === 'PAYMENT' ? 'New Payment' :
                 transactionType === 'BUYBACK' ? 'Gas Buyback' : 'Return Empty Cylinders'}
              </h3>
              
              <form onSubmit={handleTransactionSubmit} className="space-y-6">
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <Input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
                    <Input
                      type="time"
                      value={transactionTime}
                      onChange={(e) => setTransactionTime(e.target.value)}
                      required
                    />
                  </div>
                </div>


                {/* Gas Section */}
                {(transactionType === 'SALE' || transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {transactionType === 'SALE' ? 'Gas Delivery' :
                         transactionType === 'BUYBACK' ? 'Gas Buyback' :
                         'Empty Cylinder Return'}
                      </CardTitle>
                      {transactionType === 'SALE' && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                          <p><strong>Remaining Cylinders Due Logic:</strong></p>
                          <ul className="mt-1 space-y-1">
                            <li>• <strong>Sale:</strong> Current Due + Delivered Cylinders = New Due</li>
                            <li>• <strong>Return/Buyback:</strong> Current Due - Returned Cylinders = New Due</li>
                            <li>• <strong>Payment:</strong> No change to cylinder dues</li>
                          </ul>
                        </div>
                      )}
                      {transactionType === 'BUYBACK' && (
                        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-md">
                          <p><strong>Gas Buyback Logic:</strong></p>
                          <ul className="mt-1 space-y-1">
                            <li>• Enter remaining gas quantity (e.g., 5kg, 10kg)</li>
                            <li>• Enter original selling price of the cylinder</li>
                            <li>• System calculates 60% buyback rate automatically</li>
                            <li>• Buyback amount = Original Price × (Remaining Gas / Total Gas) × 60%</li>
                          </ul>
                        </div>
                      )}
                      {transactionType === 'RETURN_EMPTY' && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                          <p><strong>Empty Cylinder Return:</strong></p>
                          <ul className="mt-1 space-y-1">
                            <li>• Enter quantity of empty cylinders being returned</li>
                            <li>• This reduces the customer's cylinder dues</li>
                            <li>• No payment involved - just inventory adjustment</li>
                          </ul>
                        </div>
                      )}
                    </CardHeader>
                    
                    {/* Pricing Information Banner */}
                    {pricingInfo && transactionType === 'SALE' && (
                      <div className="px-6 pb-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-blue-900">Auto-Pricing Information</h4>
                              <p className="text-sm text-blue-700">
                                Category: <strong>{pricingInfo.category.name}</strong> | 
                                Plant Price: <strong>Rs {pricingInfo.plantPrice.price118kg}</strong> | 
                                Margin: <strong>Rs {pricingInfo.category.marginPerKg}/kg</strong>
                              </p>
                              <p className="text-sm text-blue-600 mt-1">
                                Calculated Prices: 11.8kg = Rs {pricingInfo.finalPrices.domestic118kg} | 
                                15kg = Rs {pricingInfo.finalPrices.standard15kg} | 
                                45.4kg = Rs {pricingInfo.finalPrices.commercial454kg}
                              </p>
                            </div>
                            <Button 
                              type="button" 
                              onClick={applyCalculatedPrices} 
                              variant="outline" 
                              size="sm"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <CalculatorIcon className="w-4 h-4 mr-2" />
                              Apply Auto-Pricing
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">
                                {transactionType === 'SALE' ? 'Gas Cylinder delivered' :
                                 transactionType === 'BUYBACK' ? 'Gas Cylinder Type' :
                                 'Gas Cylinder Type'}
                              </th>
                              {transactionType === 'SALE' && (
                                <>
                                  <th className="text-left py-2">Delivered Cylinders</th>
                                  <th className="text-left py-2">Price Per Item</th>
                                  <th className="text-left py-2">Total Price per Item</th>
                                </>
                              )}
                              {(transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && (
                                <th className="text-left py-2">Empty Cylinders returned</th>
                              )}
                              {transactionType === 'BUYBACK' && (
                                <>
                                  <th className="text-left py-2">Remaining Gas (kg)</th>
                                  <th className="text-left py-2">Original Price</th>
                                  <th className="text-left py-2">Buyback Rate (60%)</th>
                                  <th className="text-left py-2">Buyback Amount</th>
                                </>
                              )}
                              <th className="text-left py-2">Remaining Cylinders Due</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gasItems.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2">
                                  {item.cylinderType === 'DOMESTIC_11_8KG' ? 'Domestic (11.8kg)' :
                                   item.cylinderType === 'STANDARD_15KG' ? 'Standard (15kg)' :
                                   'Commercial (45.4kg)'}
                                </td>
                                {transactionType === 'SALE' && (
                                  <>
                                    <td className="py-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={item.delivered}
                                        onChange={(e) => updateGasItem(index, 'delivered', parseInt(e.target.value) || 0)}
                                        className="w-20"
                                      />
                                    </td>
                                    <td className="py-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.pricePerItem}
                                        onChange={(e) => updateGasItem(index, 'pricePerItem', parseFloat(e.target.value) || 0)}
                                        className="w-24"
                                      />
                                    </td>
                                    <td className="py-2 font-semibold">
                                      {formatCurrency(item.delivered * item.pricePerItem)}
                                    </td>
                                  </>
                                )}
                                {(transactionType === 'BUYBACK' || transactionType === 'RETURN_EMPTY') && (
                                  <td className="py-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.emptyReturned}
                                      onChange={(e) => updateGasItem(index, 'emptyReturned', parseInt(e.target.value) || 0)}
                                      className="w-20"
                                    />
                                  </td>
                                )}
                                {transactionType === 'BUYBACK' && (
                                  <>
                                    <td className="py-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={item.remainingKg}
                                        onChange={(e) => updateGasItem(index, 'remainingKg', parseFloat(e.target.value) || 0)}
                                        className="w-20"
                                        placeholder="5.0"
                                      />
                                    </td>
                                    <td className="py-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.originalSoldPrice}
                                        onChange={(e) => updateGasItem(index, 'originalSoldPrice', parseFloat(e.target.value) || 0)}
                                        className="w-24"
                                        placeholder="Original price"
                                      />
                                    </td>
                                    <td className="py-2 text-center font-semibold text-green-600">
                                      60%
                                    </td>
                                    <td className="py-2 font-semibold text-green-600">
                                      {formatCurrency(item.buybackTotal)}
                                    </td>
                                  </>
                                )}
                                <td className="py-2">
                                  <div className="flex items-center space-x-2">
                                    <Badge 
                                      variant={item.remainingDue > 0 ? "destructive" : "secondary"}
                                      className={item.remainingDue > 0 ? "bg-red-100 text-red-800" : ""}
                                    >
                                      {item.remainingDue}
                                    </Badge>
                                    {item.remainingDue > 0 && (
                                      <span className="text-xs text-gray-500">
                                        (Current: {getCurrentCylinderDue(item.cylinderType)})
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Accessories Section */}
                {transactionType === 'SALE' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">Accessories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-3 px-4 font-semibold text-gray-900">Item Name</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-900">Quality</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-900">Quantity</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-900">Price Per Item</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accessoryItems.map((item, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                                <td className="py-3 px-4">
                                  {item.name === 'Stove' ? (
                                    <select
                                      value={item.quality}
                                      onChange={(e) => {
                                        const newItems = [...accessoryItems];
                                        newItems[index].quality = e.target.value;
                                        setAccessoryItems(newItems);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                                      required={item.quantity > 0}
                                    >
                                      <option value="">Select Quality</option>
                                      <option value="Quality 1">Quality 1</option>
                                      <option value="Quality 2">Quality 2</option>
                                      <option value="Quality 3">Quality 3</option>
                                      <option value="Quality 4">Quality 4</option>
                                      <option value="Quality 5">Quality 5</option>
                                    </select>
                                  ) : (
                                    <span className="text-gray-400 text-sm">N/A</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newItems = [...accessoryItems];
                                      newItems[index].quantity = parseInt(e.target.value) || 0;
                                      setAccessoryItems(newItems);
                                    }}
                                    className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricePerItem}
                                    onChange={(e) => {
                                      const newItems = [...accessoryItems];
                                      newItems[index].pricePerItem = parseFloat(e.target.value) || 0;
                                      setAccessoryItems(newItems);
                                    }}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                                  />
                                </td>
                                <td className="py-3 px-4 font-semibold text-gray-900">
                                  {formatCurrency(item.quantity * item.pricePerItem)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Details - Only for PAYMENT type */}
                {transactionType === 'PAYMENT' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Against</label>
                      <select 
                        name="paymentAgainst" 
                        value={paymentAgainst}
                        onChange={(e) => {
                          setPaymentAgainst(e.target.value);
                          setPaymentQuantity(0);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select what this payment is for</option>
                        <optgroup label="Gas Cylinders">
                          <option value="DOMESTIC_11.8KG">Domestic (11.8kg)</option>
                          <option value="STANDARD_15KG">Standard (15kg)</option>
                          <option value="COMMERCIAL_45.4KG">Commercial (45.4kg)</option>
                        </optgroup>
                        <optgroup label="Accessories">
                          <option value="GAS_PIPE_FT">Gas Pipe (ft)</option>
                          <option value="STOVE">Stove</option>
                          <option value="REGULATOR_ADJUSTABLE">Regulator Adjustable</option>
                          <option value="REGULATOR_IDEAL_HIGH_PRESSURE">Regulator Ideal High Pressure</option>
                          <option value="REGULATOR_5_STAR_HIGH_PRESSURE">Regulator 5 Star High Pressure</option>
                          <option value="REGULATOR_3_STAR_LOW_PRESSURE_Q1">Regulator 3 Star Low Pressure Q1</option>
                          <option value="REGULATOR_3_STAR_LOW_PRESSURE_Q2">Regulator 3 Star Low Pressure Q2</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="ACCOUNT_RECEIVABLES">Account Receivables (General Payment)</option>
                          <option value="SPECIFIC_SALE">Specific Sale/Invoice</option>
                          <option value="CYLINDER_DEPOSIT">Cylinder Deposit</option>
                          <option value="ADVANCE_PAYMENT">Advance Payment</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Quantity Field - Only show for specific products */}
                    {(paymentAgainst && !['ACCOUNT_RECEIVABLES', 'SPECIFIC_SALE', 'CYLINDER_DEPOSIT', 'ADVANCE_PAYMENT'].includes(paymentAgainst)) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                        <Input
                          type="number"
                          value={paymentQuantity}
                          onChange={(e) => setPaymentQuantity(parseInt(e.target.value) || 0)}
                          placeholder="Enter quantity"
                          min="1"
                          step="1"
                          className="w-32"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Description</label>
                      <Input 
                        name="paymentDescription" 
                        placeholder="e.g., Payment for Sale B2B202509220041 - STANDARD_15KG Cylinder x1"
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount (PKR)</label>
                      <Input 
                        name="paymentAmount" 
                        type="number"
                        placeholder="Enter payment amount"
                        step="0.01"
                        min="0.01"
                        required
                        className="text-lg"
                      />
                    </div>
                  </div>
                )}


                {/* Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Reference</label>
                    <Input name="paymentReference" placeholder="Payment Reference" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                    <Input name="notes" placeholder="Notes" />
                  </div>
                </div>

                {/* Total Amount */}
                <div className="text-right space-y-2">
                  {transactionType === 'SALE' && (
                    <p className="text-lg font-semibold text-gray-900">
                      Total Sale Amount: {formatCurrency(
                        gasItems.reduce((sum, item) => sum + (item.delivered * item.pricePerItem), 0) +
                        accessoryItems.reduce((sum, item) => sum + (item.quantity * item.pricePerItem), 0)
                      )}
                    </p>
                  )}
                  {transactionType === 'BUYBACK' && (
                    <div>
                      <p className="text-lg font-semibold text-green-600">
                        Total Buyback Amount: {formatCurrency(
                          gasItems.reduce((sum, item) => sum + item.buybackTotal, 0)
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        (60% of original price for remaining gas)
                      </p>
                    </div>
                  )}
                  {transactionType === 'PAYMENT' && (
                    <div className="text-right space-y-1">
                      <p className="text-lg font-semibold text-blue-600">
                        Payment Amount: Rs 0
                      </p>
                      <p className="text-sm text-gray-600">
                        Payment Against: {paymentAgainst || '[Select from dropdown above]'}
                        {paymentQuantity > 0 && ` (Qty: ${paymentQuantity})`}
                      </p>
                    </div>
                  )}
                  {transactionType === 'RETURN_EMPTY' && (
                    <p className="text-lg font-semibold text-gray-600">
                      Empty Return - No Amount
                    </p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTransactionForm(false)}
                    className="font-medium"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-medium">
                    Create Transaction
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Ledger */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Transaction Ledger</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Complete transaction history with running balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Bill S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Transaction Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Balance After
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className={transaction.voided ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" suppressHydrationWarning>
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" suppressHydrationWarning>
                      {formatTime(transaction.time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {transaction.billSno}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        transaction.transactionType === 'SALE' ? 'success' :
                        transaction.transactionType === 'PAYMENT' ? 'info' :
                        transaction.transactionType === 'BUYBACK' ? 'warning' : 'secondary'
                      }>
                        {transaction.transactionType}
                        {transaction.voided && ' (VOIDED)'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="max-w-xs">
                        {transaction.items.map((item, index) => (
                          <div key={index} className="text-xs">
                            {item.productName} x{item.quantity}
                            {item.cylinderType && ` (${item.cylinderType})`}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {transaction.transactionType === 'SALE' ? formatCurrency(transaction.totalAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'].includes(transaction.transactionType) 
                        ? formatCurrency(transaction.totalAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(customer.ledgerBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* Open transaction details modal */}}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} transactions
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
