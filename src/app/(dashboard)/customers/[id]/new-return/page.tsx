'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string | null;
  ledgerBalance: number;
  domestic118kgDue: number;
  standard15kgDue: number;
  commercial454kgDue: number;
}

interface ReturnItem {
  id: string;
  cylinderType: string;
  quantity: number;
  condition: 'EMPTY' | 'PARTIAL' | 'FULL';
  remainingKg: number | null;
  originalSoldPrice: number | null;
  buybackRate: number;
  buybackPricePerItem: number;
  buybackTotal: number;
}

export default function NewReturnPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<'LEDGER' | 'CASH'>('LEDGER');

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  // Force validation when customer data changes
  useEffect(() => {
    if (customer && returnItems.length > 0) {
      setReturnItems(items => items.map(item => {
        if (item.cylinderType) {
          const maxQuantity = getMaxQuantityForCylinderType(item.cylinderType, customer);
          if (item.quantity > maxQuantity) {
            return { ...item, quantity: maxQuantity };
          }
        }
        return item;
      }));
    }
  }, [customer]);


  const fetchCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const addReturnItem = () => {
    const newItem: ReturnItem = {
      id: Date.now().toString(),
      cylinderType: '',
      quantity: 1,
      condition: 'EMPTY',
      remainingKg: null,
      originalSoldPrice: null,
      buybackRate: 0.60,
      buybackPricePerItem: 0,
      buybackTotal: 0,
    };
    setReturnItems([...returnItems, newItem]);
  };

  const updateReturnItem = async (id: string, field: keyof ReturnItem, value: any) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Validate quantity against remaining cylinders due
        if (field === 'quantity' && customer && updatedItem.cylinderType) {
          const maxQuantity = getMaxQuantityForCylinderType(updatedItem.cylinderType, customer);
          const numericValue = parseInt(value) || 0;
          
          // Always cap the quantity to the maximum allowed
          const cappedQuantity = Math.min(Math.max(numericValue, 0), maxQuantity);
          updatedItem.quantity = cappedQuantity;
          
          if (numericValue > maxQuantity) {
            setError(`Cannot return more than ${maxQuantity} ${updatedItem.cylinderType} cylinders. Only ${maxQuantity} are currently due.`);
          } else {
            setError(null);
          }
        }
        
        // Auto-calculate buyback amounts for partial/full returns
        if (field === 'condition' || field === 'quantity' || field === 'originalSoldPrice') {
          if (updatedItem.condition === 'PARTIAL' || updatedItem.condition === 'FULL') {
            if (updatedItem.originalSoldPrice) {
              updatedItem.buybackPricePerItem = updatedItem.originalSoldPrice * updatedItem.buybackRate;
              updatedItem.buybackTotal = updatedItem.buybackPricePerItem * updatedItem.quantity;
            }
          } else {
            updatedItem.buybackPricePerItem = 0;
            updatedItem.buybackTotal = 0;
          }
        }

        // Auto-fetch original price when cylinder type is selected
        if (field === 'cylinderType' && value && customer) {
          fetchOriginalPrice(value, updatedItem.id);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent, itemId: string, cylinderType: string) => {
    if (!customer || !cylinderType) return;
    
    const maxQuantity = getMaxQuantityForCylinderType(cylinderType, customer);
    
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if ([8, 9, 27, 13, 35, 36, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
      return;
    }
    
    // Check if the new value would exceed the maximum
    const input = e.target as HTMLInputElement;
    const currentValue = input.value;
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    
    // Create the new value by replacing the selected text with the new key
    const newValue = currentValue.substring(0, selectionStart) + e.key + currentValue.substring(selectionEnd);
    const numericValue = parseInt(newValue);
    
    if (!isNaN(numericValue) && numericValue > maxQuantity) {
      e.preventDefault();
      setError(`Cannot return more than ${maxQuantity} ${cylinderType} cylinders. Only ${maxQuantity} are currently due.`);
    } else {
      setError(null);
    }
  };

  const handleQuantityPaste = (e: React.ClipboardEvent, itemId: string, cylinderType: string) => {
    if (!customer) return;
    
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedValue = parseInt(pastedText);
    const maxQuantity = getMaxQuantityForCylinderType(cylinderType, customer);
    
    if (isNaN(pastedValue) || pastedValue < 0) {
      setError('Please enter a valid number');
      return;
    }
    
    if (pastedValue > maxQuantity) {
      setError(`Cannot return more than ${maxQuantity} ${cylinderType} cylinders. Only ${maxQuantity} are currently due.`);
      updateReturnItem(itemId, 'quantity', maxQuantity);
    } else {
      setError(null);
      updateReturnItem(itemId, 'quantity', pastedValue);
    }
  };

  const handleQuantityInput = (e: React.FormEvent<HTMLInputElement>, itemId: string, cylinderType: string) => {
    if (!customer || !cylinderType) return;
    
    const input = e.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    const maxQuantity = getMaxQuantityForCylinderType(cylinderType, customer);
    
    if (value > maxQuantity) {
      input.value = maxQuantity.toString();
      setError(`Cannot return more than ${maxQuantity} ${cylinderType} cylinders. Only ${maxQuantity} are currently due.`);
      updateReturnItem(itemId, 'quantity', maxQuantity);
    } else {
      setError(null);
      updateReturnItem(itemId, 'quantity', value);
    }
  };

  const fetchOriginalPrice = async (cylinderType: string, itemId: string) => {
    try {
      // First try to get price from current pricing system
      const pricingResponse = await fetch(
        `/api/pricing/calculate?customerId=${customerId}&customerType=B2B`
      );
      
      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        let calculatedPrice = 0;
        
        switch (cylinderType) {
          case 'DOMESTIC_11_8KG':
            calculatedPrice = pricingData.finalPrices.domestic118kg;
            break;
          case 'STANDARD_15KG':
            calculatedPrice = pricingData.finalPrices.standard15kg;
            break;
          case 'COMMERCIAL_45_4KG':
            calculatedPrice = pricingData.finalPrices.commercial454kg;
            break;
        }
        
        if (calculatedPrice > 0) {
          setReturnItems(items => items.map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item, originalSoldPrice: calculatedPrice };
              if (updatedItem.condition === 'PARTIAL' || updatedItem.condition === 'FULL') {
                updatedItem.buybackPricePerItem = updatedItem.originalSoldPrice * updatedItem.buybackRate;
                updatedItem.buybackTotal = updatedItem.buybackPricePerItem * updatedItem.quantity;
              }
              return updatedItem;
            }
            return item;
          }));
          return;
        }
      }
      
      // Fallback to historical transaction data
      const response = await fetch(
        `/api/customers/${customerId}/original-price?productName=${encodeURIComponent(cylinderType)}&cylinderType=${encodeURIComponent(cylinderType)}`
      );
      const data = await response.json();
      
      if (data.found) {
        setReturnItems(items => items.map(item => {
          if (item.id === itemId) {
            const updatedItem = { ...item, originalSoldPrice: data.originalSoldPrice };
            if (updatedItem.condition === 'PARTIAL' || updatedItem.condition === 'FULL') {
              updatedItem.buybackPricePerItem = updatedItem.originalSoldPrice * updatedItem.buybackRate;
              updatedItem.buybackTotal = updatedItem.buybackPricePerItem * updatedItem.quantity;
            }
            return updatedItem;
          }
          return item;
        }));
      } else {
        // Show warning that manual input is required
        setError(data.message || 'Original sold price not found — please enter original price to compute buyback');
      }
    } catch (err) {
      console.error('Error fetching original price:', err);
    }
  };

  const removeReturnItem = (id: string) => {
    setReturnItems(items => items.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const buybackTotal = returnItems.reduce((sum, item) => sum + item.buybackTotal, 0);
    return { buybackTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (returnItems.length === 0) {
        setError('Please add at least one item to return');
        return;
      }

      // Validate over-return scenarios
      for (const item of returnItems) {
        if (item.cylinderType === 'Domestic (11.8kg)' && item.quantity > customer!.domestic118kgDue) {
          const confirmed = window.confirm(
            `Warning — returned more cylinders than recorded as due. Returning ${item.quantity} but only ${customer!.domestic118kgDue} are due. Continue?`
          );
          if (!confirmed) return;
        }
        if (item.cylinderType === 'Standard (15kg)' && item.quantity > customer!.standard15kgDue) {
          const confirmed = window.confirm(
            `Warning — returned more cylinders than recorded as due. Returning ${item.quantity} but only ${customer!.standard15kgDue} are due. Continue?`
          );
          if (!confirmed) return;
        }
        if (item.cylinderType === 'Commercial (45.4kg)' && item.quantity > customer!.commercial454kgDue) {
          const confirmed = window.confirm(
            `Warning — returned more cylinders than recorded as due. Returning ${item.quantity} but only ${customer!.commercial454kgDue} are due. Continue?`
          );
          if (!confirmed) return;
        }
      }

      // Validate buyback items have original prices
      const buybackItems = returnItems.filter(item => item.condition === 'PARTIAL' || item.condition === 'FULL');
      for (const item of buybackItems) {
        if (!item.originalSoldPrice || item.originalSoldPrice <= 0) {
          setError('Original sold price not found — please enter original price to compute buyback');
          return;
        }
      }

      const totals = calculateTotals();
      const now = new Date();
      const billSno = `BILL-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;

      // Create buyback transaction if there are partial/full returns
      if (totals.buybackTotal > 0) {
        const buybackTransactionData = {
          transactionType: 'BUYBACK',
          billSno,
          customerId,
          date: now.toISOString().split('T')[0],
          time: now.toISOString(),
          totalAmount: totals.buybackTotal,
          notes: 'Buyback transaction for returned cylinders with remaining gas',
          items: returnItems
            .filter(item => item.condition === 'PARTIAL' || item.condition === 'FULL')
            .map(item => ({
              productId: null, // No specific product ID for cylinder returns
              productName: `${item.cylinderType} Cylinder`,
              quantity: item.quantity,
              pricePerItem: item.originalSoldPrice || 0,
              totalPrice: item.originalSoldPrice ? item.originalSoldPrice * item.quantity : 0,
              cylinderType: item.cylinderType,
              returnedCondition: item.condition,
              remainingKg: item.remainingKg,
              originalSoldPrice: item.originalSoldPrice,
              buybackRate: item.buybackRate,
              buybackPricePerItem: item.buybackPricePerItem,
              buybackTotal: item.buybackTotal,
            })),
        };

        const buybackResponse = await fetch('/api/b2b-transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buybackTransactionData),
        });

        if (!buybackResponse.ok) {
          throw new Error('Failed to process buyback transaction');
        }
      }

      // Create empty return transaction for all items
      const emptyReturnTransactionData = {
        transactionType: 'RETURN_EMPTY',
        billSno: `BILL-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now() + 1).slice(-6)}`,
        customerId,
        date: now.toISOString().split('T')[0],
        time: now.toISOString(),
        totalAmount: 0,
        notes: 'Empty cylinder return transaction',
        items: returnItems.map(item => ({
          productId: null, // No specific product ID for cylinder returns
          productName: `${item.cylinderType} Cylinder`,
          quantity: item.quantity,
          pricePerItem: 0,
          totalPrice: 0,
          cylinderType: item.cylinderType,
          returnedCondition: 'EMPTY',
        })),
      };

      console.log('Calling /api/b2b-transactions with data:', emptyReturnTransactionData);
      
      const returnResponse = await fetch('/api/b2b-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emptyReturnTransactionData),
      });

      if (!returnResponse.ok) {
        throw new Error('Failed to process return transaction');
      }

      // If cash settlement, create payment transaction
      if (settlementMethod === 'CASH' && totals.buybackTotal > 0) {
        const paymentTransactionData = {
          transactionType: 'PAYMENT',
          billSno: `BILL-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now() + 2).slice(-6)}`,
          customerId,
          date: now.toISOString().split('T')[0],
          time: now.toISOString(),
          totalAmount: totals.buybackTotal,
          paymentReference: `BUYBACK-CASH-${billSno}`,
          notes: 'Cash payment for buyback',
          items: [{
            productId: null, // No specific product ID for payments
            productName: 'Buyback Payment',
            quantity: 1,
            pricePerItem: totals.buybackTotal,
            totalPrice: totals.buybackTotal,
          }],
        };

        const paymentResponse = await fetch('/api/b2b-transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentTransactionData),
        });

        if (!paymentResponse.ok) {
          throw new Error('Failed to process cash payment');
        }
      }

      router.push(`/customers/${customerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process return');
    } finally {
      setSaving(false);
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

  const getCylindersDueSummary = (customer: Customer) => {
    const parts = [];
    if (customer.domestic118kgDue > 0) parts.push(`11.8kg: ${customer.domestic118kgDue}`);
    if (customer.standard15kgDue > 0) parts.push(`15kg: ${customer.standard15kgDue}`);
    if (customer.commercial454kgDue > 0) parts.push(`45.4kg: ${customer.commercial454kgDue}`);
    return parts.length > 0 ? parts.join(' / ') : 'None';
  };

  const getMaxQuantityForCylinderType = (cylinderType: string, customer: Customer): number => {
    switch (cylinderType) {
      case 'Domestic (11.8kg)':
        return customer.domestic118kgDue;
      case 'Standard (15kg)':
        return customer.standard15kgDue;
      case 'Commercial (45.4kg)':
        return customer.commercial454kgDue;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading return form...</p>
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
            onClick={() => router.push('/customers')}
            className="mt-4"
          >
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/customers/${customerId}`)}
          className="flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Customer
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Return/Buyback</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Process cylinder returns and buybacks for {customer.name}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Person</p>
              <p className="text-lg font-semibold text-gray-900">{customer.contactPerson}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Ledger Balance</p>
              <p className={`text-lg font-semibold ${
                customer.ledgerBalance > 0 ? 'text-red-600' : 
                customer.ledgerBalance < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {formatCurrency(customer.ledgerBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cylinders Due</p>
              <p className="text-lg font-semibold text-gray-900">
                {getCylindersDueSummary(customer)}
              </p>
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

      {/* Return Form */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Empty Cylinders returned</CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Add cylinders to return (empty, partial, or full)
              </CardDescription>
            </div>
            <Button onClick={addReturnItem} className="flex items-center">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Return Items */}
            {returnItems.map((item, index) => (
              <Card key={item.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cylinder Type
                      </label>
                      <Select
                        value={item.cylinderType}
                        onValueChange={(value) => updateReturnItem(item.id, 'cylinderType', value)}
                      >
                        <option value="">Select Type</option>
                        <option value="Domestic (11.8kg)">Domestic (11.8kg)</option>
                        <option value="Standard (15kg)">Standard (15kg)</option>
                        <option value="Commercial (45.4kg)">Commercial (45.4kg)</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Quantity
                        {item.cylinderType && customer && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Max: {getMaxQuantityForCylinderType(item.cylinderType, customer)})
                          </span>
                        )}
                      </label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateReturnItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        onInput={(e) => handleQuantityInput(e, item.id, item.cylinderType)}
                        onKeyDown={(e) => handleQuantityKeyDown(e, item.id, item.cylinderType)}
                        onPaste={(e) => handleQuantityPaste(e, item.id, item.cylinderType)}
                        min="0"
                        max={item.cylinderType ? getMaxQuantityForCylinderType(item.cylinderType, customer) : undefined}
                        step="1"
                        className={item.cylinderType && item.quantity > getMaxQuantityForCylinderType(item.cylinderType, customer) ? 'border-red-500 bg-red-50' : ''}
                        placeholder="0"
                      />
                      {item.cylinderType && item.quantity > getMaxQuantityForCylinderType(item.cylinderType, customer) && (
                        <p className="text-xs text-red-600 mt-1">
                          Cannot exceed {getMaxQuantityForCylinderType(item.cylinderType, customer)} cylinders
                        </p>
                      )}
                      {item.cylinderType && customer && getMaxQuantityForCylinderType(item.cylinderType, customer) === 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          No cylinders of this type are currently due
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Condition
                      </label>
                      <Select
                        value={item.condition}
                        onValueChange={(value) => updateReturnItem(item.id, 'condition', value)}
                      >
                        <option value="EMPTY">Empty</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="FULL">Full</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Remaining KG (if Partial)
                      </label>
                      <Input
                        type="number"
                        value={item.remainingKg || ''}
                        onChange={(e) => updateReturnItem(item.id, 'remainingKg', parseFloat(e.target.value) || null)}
                        disabled={item.condition !== 'PARTIAL'}
                        step="0.1"
                        min="0"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeReturnItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Buyback Calculation */}
                  {(item.condition === 'PARTIAL' || item.condition === 'FULL') && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-2">Buyback Calculation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Original Sold Price</label>
                          <Input
                            type="number"
                            value={item.originalSoldPrice || ''}
                            onChange={(e) => updateReturnItem(item.id, 'originalSoldPrice', parseFloat(e.target.value) || null)}
                            placeholder="Enter original price"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Buyback Rate</label>
                          <Input
                            type="number"
                            value={item.buybackRate}
                            onChange={(e) => updateReturnItem(item.id, 'buybackRate', parseFloat(e.target.value) || 0.60)}
                            step="0.01"
                            min="0"
                            max="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Buyback Price Per Item</label>
                          <Input
                            type="number"
                            value={item.buybackPricePerItem}
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Buyback Total</label>
                          <Input
                            type="number"
                            value={item.buybackTotal}
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {returnItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet. Click "Add Item" to start adding cylinders to return.</p>
              </div>
            )}

            {/* Settlement Method */}
            {totals.buybackTotal > 0 && (
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Settlement Method</h4>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="LEDGER"
                        checked={settlementMethod === 'LEDGER'}
                        onChange={(e) => setSettlementMethod(e.target.value as 'LEDGER' | 'CASH')}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Credit to Ledger</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="CASH"
                        checked={settlementMethod === 'CASH'}
                        onChange={(e) => setSettlementMethod(e.target.value as 'LEDGER' | 'CASH')}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Cash Payment Now</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {settlementMethod === 'LEDGER' 
                      ? 'The buyback amount will be credited to the customer\'s ledger balance'
                      : 'A separate payment transaction will be created for the buyback amount'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Totals */}
            {returnItems.length > 0 && (
              <Card className="border border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Buyback Amount</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(totals.buybackTotal)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">Settlement Method</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {settlementMethod === 'LEDGER' ? 'Ledger Credit' : 'Cash Payment'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/customers/${customerId}`)}
                className="font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || returnItems.length === 0}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Process Return
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
