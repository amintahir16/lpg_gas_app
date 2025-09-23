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
  PlusIcon,
  TrashIcon,
  PrinterIcon,
  CheckIcon,
  ExclamationTriangleIcon
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

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  stockQuantity: number;
  stockType: string;
  priceSoldToCustomer: number;
}

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  cylinderType: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [billSno, setBillSno] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [allowNegativeInventory, setAllowNegativeInventory] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
      fetchProducts();
      generateBillNumber();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateBillNumber = async () => {
    try {
      const response = await fetch('/api/bill-sequence', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setBillSno(data.billSno);
      }
    } catch (err) {
      console.error('Error generating bill number:', err);
    }
  };

  const addSaleItem = () => {
    const newItem: SaleItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      cylinderType: '',
      quantity: 1,
      pricePerItem: 0,
      totalPrice: 0,
    };
    setSaleItems([...saleItems, newItem]);
  };

  const updateSaleItem = (id: string, field: keyof SaleItem, value: any) => {
    setSaleItems(items => items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate total price
        if (field === 'quantity' || field === 'pricePerItem') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.pricePerItem;
        }
        
        // Auto-set price from product
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.pricePerItem = product.priceSoldToCustomer;
            updatedItem.totalPrice = updatedItem.quantity * product.priceSoldToCustomer;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeSaleItem = (id: string) => {
    setSaleItems(items => items.filter(item => item.id !== id));
  };

  const validateInventory = () => {
    const newWarnings: string[] = [];
    
    saleItems.forEach(item => {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.stockQuantity < item.quantity) {
          newWarnings.push(
            `Insufficient stock for ${item.productName}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
          );
        }
      }
    });
    
    setWarnings(newWarnings);
    return newWarnings.length === 0;
  };

  const previewInvoice = () => {
    const totals = calculateTotals();
    const invoiceData = {
      customer: customer?.name || 'Unknown Customer',
      billSno,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
      items: saleItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total
    };
    
    console.log('Invoice Preview:', invoiceData);
    alert('Invoice preview generated! (Check console for data)');
  };

  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const discountAmount = subtotal * (discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (tax / 100);
    const total = taxableAmount + taxAmount;
    return {
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate inventory
      if (!allowNegativeInventory && !validateInventory()) {
        setError('Please resolve inventory warnings before proceeding');
        return;
      }

      if (saleItems.length === 0) {
        setError('Please add at least one item to the sale');
        return;
      }

      const totals = calculateTotals();
      const now = new Date();

      const transactionData = {
        transactionType: 'SALE',
        billSno,
        customerId,
        date: now.toISOString().split('T')[0],
        time: now.toISOString(),
        totalAmount: totals.total,
        notes: 'B2B Sale Transaction',
        items: saleItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          totalPrice: item.totalPrice,
          cylinderType: item.cylinderType,
        })),
      };

      const response = await fetch('/api/b2b-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to create sale transaction');
      }

      // Show success message
      alert('Sale transaction created successfully!');
      
      // Redirect to customer detail page
      router.push(`/customers/${customerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
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

  const gasCylinders = products.filter(p => p.category === 'GAS_CYLINDER');
  const accessories = products.filter(p => p.category === 'ACCESSORY');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading sale form...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Create a new sale transaction for {customer.name}
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
              <p className="text-sm font-medium text-gray-500">Bill S.No</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{billSno}</p>
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

      {/* Inventory Warnings */}
      {warnings.length > 0 && (
        <Card className="border-0 shadow-sm bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-yellow-800 flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              Inventory Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <p key={index} className="text-yellow-700 text-sm">{warning}</p>
              ))}
            </div>
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={allowNegativeInventory}
                  onChange={(e) => setAllowNegativeInventory(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-yellow-800">
                  Allow negative inventory (requires reason)
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sale Form */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Gas</CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Gas Cylinder delivered and accessories
              </CardDescription>
            </div>
            <Button onClick={addSaleItem} className="flex items-center">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sale Items */}
            {saleItems.map((item, index) => (
              <Card key={item.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Item Name
                      </label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) => updateSaleItem(item.id, 'productId', value)}
                      >
                        <option value="">Select Product</option>
                        <optgroup label="Gas">
                          {gasCylinders.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - Stock: {product.stockQuantity}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Accessories">
                          {accessories.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - Stock: {product.stockQuantity}
                            </option>
                          ))}
                        </optgroup>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cylinder Type
                      </label>
                      <Select
                        value={item.cylinderType}
                        onValueChange={(value) => updateSaleItem(item.id, 'cylinderType', value)}
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
                      </label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateSaleItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                        step="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Price Per Item
                      </label>
                      <Input
                        type="number"
                        value={item.pricePerItem}
                        onChange={(e) => updateSaleItem(item.id, 'pricePerItem', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Price per Item
                        </label>
                        <Input
                          type="number"
                          value={item.totalPrice}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSaleItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {saleItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet. Click "Add Item" to start adding products.</p>
              </div>
            )}

            {/* Discount and Tax Fields */}
            {saleItems.length > 0 && (
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Discount (%)
                      </label>
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tax (%)
                      </label>
                      <Input
                        type="number"
                        value={tax}
                        onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Totals */}
            {saleItems.length > 0 && (
              <Card className="border border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-end space-x-8">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">Subtotal</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(totals.subtotal)}
                      </p>
                    </div>
                    {discount > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-500">Discount</p>
                        <p className="text-lg font-semibold text-green-600">
                          -{formatCurrency(totals.discount)}
                        </p>
                      </div>
                    )}
                    {tax > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-500">Tax</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {formatCurrency(totals.tax)}
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">Total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(totals.total)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method */}
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="creditSale"
                    defaultChecked
                    disabled
                    className="rounded"
                  />
                  <label htmlFor="creditSale" className="text-sm font-semibold text-gray-700">
                    Sell on Credit (B2B) - Default for B2B customers
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This sale will increase the customer's ledger balance by {formatCurrency(totals.total)}
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => validateInventory()}
                className="flex items-center"
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                Validate Inventory
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => previewInvoice()}
                className="flex items-center"
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                Preview Invoice
              </Button>
              <Button
                type="submit"
                disabled={saving || saleItems.length === 0}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Save & Print Invoice
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
