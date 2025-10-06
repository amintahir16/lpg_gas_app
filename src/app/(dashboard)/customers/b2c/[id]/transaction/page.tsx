'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CalculatorIcon } from '@heroicons/react/24/outline';

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
}

interface GasItem {
  cylinderType: string;
  quantity: number;
  pricePerItem: number;
}

interface SecurityItem {
  cylinderType: string;
  quantity: number;
  pricePerItem: number;
  isReturn: boolean;
}

interface AccessoryItem {
  itemName: string;
  quantity: number;
  pricePerItem: number;
}

const CYLINDER_TYPES = [
  { value: 'DOMESTIC_11_8KG', label: 'Domestic (11.8kg)', securityPrice: 30000 },
  { value: 'STANDARD_15KG', label: 'Standard (15kg)', securityPrice: 50000 },
  { value: 'COMMERCIAL_45_4KG', label: 'Commercial (45.4kg)', securityPrice: 90000 }
];

const ACCESSORY_OPTIONS = [
  'Gas Pipe (ft)',
  'Stove',
  'Regulator Adjustable',
  'Regulator Ideal High Pressure',
  'Regulator 5 Star High Pressure',
  'Regulator 3 Star Low Pressure Q1',
  'Regulator 3 Star Low Pressure Q2'
];

export default function B2CTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<B2CCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  // Transaction items
  const [gasItems, setGasItems] = useState<GasItem[]>([]);
  const [securityItems, setSecurityItems] = useState<SecurityItem[]>([]);
  const [accessoryItems, setAccessoryItems] = useState<AccessoryItem[]>([]);

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

  const addGasItem = () => {
    setGasItems([...gasItems, { cylinderType: '', quantity: 1, pricePerItem: 0 }]);
  };

  const removeGasItem = (index: number) => {
    setGasItems(gasItems.filter((_, i) => i !== index));
  };

  const updateGasItem = (index: number, field: keyof GasItem, value: any) => {
    const updated = [...gasItems];
    updated[index] = { ...updated[index], [field]: value };
    setGasItems(updated);
  };

  const addSecurityItem = () => {
    setSecurityItems([...securityItems, { cylinderType: '', quantity: 1, pricePerItem: 0, isReturn: false }]);
  };

  const removeSecurityItem = (index: number) => {
    setSecurityItems(securityItems.filter((_, i) => i !== index));
  };

  const updateSecurityItem = (index: number, field: keyof SecurityItem, value: any) => {
    const updated = [...securityItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill security price when cylinder type is selected
    if (field === 'cylinderType') {
      const cylinderType = CYLINDER_TYPES.find(t => t.value === value);
      if (cylinderType) {
        updated[index].pricePerItem = updated[index].isReturn 
          ? cylinderType.securityPrice * 0.75 // 25% deduction for returns
          : cylinderType.securityPrice;
      }
    }
    
    // Recalculate price when return status changes
    if (field === 'isReturn') {
      const cylinderType = CYLINDER_TYPES.find(t => t.value === updated[index].cylinderType);
      if (cylinderType) {
        updated[index].pricePerItem = value 
          ? cylinderType.securityPrice * 0.75 // 25% deduction for returns
          : cylinderType.securityPrice;
      }
    }
    
    setSecurityItems(updated);
  };

  const addAccessoryItem = () => {
    setAccessoryItems([...accessoryItems, { itemName: '', quantity: 1, pricePerItem: 0 }]);
  };

  const removeAccessoryItem = (index: number) => {
    setAccessoryItems(accessoryItems.filter((_, i) => i !== index));
  };

  const updateAccessoryItem = (index: number, field: keyof AccessoryItem, value: any) => {
    const updated = [...accessoryItems];
    updated[index] = { ...updated[index], [field]: value };
    setAccessoryItems(updated);
  };

  const calculateTotal = (items: any[], priceField: string, quantityField: string) => {
    return items.reduce((sum, item) => {
      return sum + (Number(item[priceField]) * Number(item[quantityField]));
    }, 0);
  };

  const gasTotal = calculateTotal(gasItems, 'pricePerItem', 'quantity');
  const securityTotal = calculateTotal(securityItems, 'pricePerItem', 'quantity');
  const accessoryTotal = calculateTotal(accessoryItems, 'pricePerItem', 'quantity');
  const subtotal = gasTotal + securityTotal + accessoryTotal;
  const finalTotal = subtotal + Number(deliveryCharges);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gasItems.length && !securityItems.length && !accessoryItems.length) {
      setError('Please add at least one item to the transaction');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const transactionData = {
        customerId,
        date: new Date(date),
        time: new Date(`2000-01-01T${time}`),
        deliveryCharges: Number(deliveryCharges),
        paymentMethod,
        notes: notes || null,
        gasItems: gasItems.filter(item => item.cylinderType && item.quantity > 0),
        securityItems: securityItems.filter(item => item.cylinderType && item.quantity > 0),
        accessoryItems: accessoryItems.filter(item => item.itemName && item.quantity > 0)
      };

      const response = await fetch('/api/customers/b2c/transactions', {
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
      router.push(`/customers/b2c/${customerId}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (error && !customer) {
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
              <p className="text-red-700 font-medium">{error}</p>
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
              onClick={() => router.push(`/customers/b2c/${customerId}`)}
              className="mr-4 flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Customer
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">New Transaction</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Customer: {customer?.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Details */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Gas Items */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Gas Cylinders</CardTitle>
                <CardDescription className="text-gray-600 font-medium">
                  Add gas cylinder sales
                </CardDescription>
              </div>
              <Button type="button" onClick={addGasItem} variant="outline" size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Gas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {gasItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cylinder Type</label>
                  <Select 
                    value={item.cylinderType} 
                    onChange={(e) => updateGasItem(index, 'cylinderType', e.target.value)}
                  >
                    <option value="">Select type</option>
                    {CYLINDER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateGasItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Item</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.pricePerItem}
                    onChange={(e) => updateGasItem(index, 'pricePerItem', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => removeGasItem(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {gasItems.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No gas items added yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Deposit Items */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Security Deposit</CardTitle>
                <CardDescription className="text-gray-600 font-medium">
                  Add security deposits (25% deduction for returns)
                </CardDescription>
              </div>
              <Button type="button" onClick={addSecurityItem} variant="outline" size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Security
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {securityItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cylinder Type</label>
                  <Select 
                    value={item.cylinderType} 
                    onChange={(e) => updateSecurityItem(index, 'cylinderType', e.target.value)}
                  >
                    <option value="">Select type</option>
                    {CYLINDER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateSecurityItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Item</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.pricePerItem}
                    onChange={(e) => updateSecurityItem(index, 'pricePerItem', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return?</label>
                  <Select 
                    value={item.isReturn.toString()} 
                    onChange={(e) => updateSecurityItem(index, 'isReturn', e.target.value === 'true')}
                  >
                    <option value="false">New Deposit</option>
                    <option value="true">Return (25% off)</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => removeSecurityItem(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {securityItems.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No security deposits added yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accessory Items */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Accessories</CardTitle>
                <CardDescription className="text-gray-600 font-medium">
                  Add accessories and equipment
                </CardDescription>
              </div>
              <Button type="button" onClick={addAccessoryItem} variant="outline" size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Accessory
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accessoryItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <Select 
                    value={item.itemName} 
                    onChange={(e) => updateAccessoryItem(index, 'itemName', e.target.value)}
                  >
                    <option value="">Select item</option>
                    {ACCESSORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateAccessoryItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Item</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.pricePerItem}
                    onChange={(e) => updateAccessoryItem(index, 'pricePerItem', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => removeAccessoryItem(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {accessoryItems.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No accessories added yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-blue-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <CalculatorIcon className="w-5 h-5 mr-2" />
              Transaction Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gas Total:</span>
                  <span className="font-semibold">Rs {gasTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Total:</span>
                  <span className="font-semibold">Rs {securityTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accessories Total:</span>
                  <span className="font-semibold">Rs {accessoryTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-900 font-medium">Subtotal:</span>
                  <span className="font-bold">Rs {subtotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charges</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryCharges}
                    onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-lg font-bold text-gray-900">Total Amount Due:</span>
                  <span className="text-xl font-bold text-green-600">Rs {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/customers/b2c/${customerId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || (!gasItems.length && !securityItems.length && !accessoryItems.length)}
            className="font-semibold"
          >
            {submitting ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </form>
    </div>
  );
}
