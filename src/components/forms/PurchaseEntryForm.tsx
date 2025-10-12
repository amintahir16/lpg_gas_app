'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Save, 
  X, 
  Package,
  Calendar,
  FileText,
  DollarSign
} from 'lucide-react';

interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  category: string;
}

interface PurchaseEntryFormProps {
  vendor?: Vendor;
  category: string;
  onSave: (data: PurchaseEntryData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface PurchaseEntryData {
  vendorId: string;
  category: string;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
  invoiceNumber?: string;
  notes?: string;
}

const categoryItems = {
  // URL format (for category pages)
  'cylinder-purchase': [
    'Domestic (11.8kg) Cylinder',
    'Standard (15kg) Cylinder',
    'Commercial (45.4kg) Cylinder'
  ],
  'gas-purchase': [
    'Domestic (11.8kg) Gas',
    'Standard (15kg) Gas',
    'Commercial (45.4kg) Gas'
  ],
  'vaporizer-purchase': [
    '20kg Vaporizer',
    '30kg Vaporizer',
    '40kg Vaporizer'
  ],
  'accessories-purchase': [
    'Regulator',
    'Stove Quality 1',
    'Stove Quality 2',
    'Stove Quality 3',
    'Stove Quality 4',
    'Stove Quality 5',
    'Pipe',
    'High Pressure Regulator',
    'Regulator Quality 1',
    'Regulator Quality 2'
  ],
  'valves-purchase': [
    'Safety Valve',
    'Check Valve',
    'Control Valve',
    'Relief Valve'
  ],
  // Database enum format (for vendor details)
  'CYLINDER_PURCHASE': [
    'Domestic (11.8kg) Cylinder',
    'Standard (15kg) Cylinder',
    'Commercial (45.4kg) Cylinder'
  ],
  'GAS_PURCHASE': [
    'Domestic (11.8kg) Gas',
    'Standard (15kg) Gas',
    'Commercial (45.4kg) Gas'
  ],
  'VAPORIZER_PURCHASE': [
    '20kg Vaporizer',
    '30kg Vaporizer',
    '40kg Vaporizer'
  ],
  'ACCESSORIES_PURCHASE': [
    'Regulator',
    'Stove Quality 1',
    'Stove Quality 2',
    'Stove Quality 3',
    'Stove Quality 4',
    'Stove Quality 5',
    'Pipe',
    'High Pressure Regulator',
    'Regulator Quality 1',
    'Regulator Quality 2'
  ],
  'VALVES_PURCHASE': [
    'Safety Valve',
    'Check Valve',
    'Control Valve',
    'Relief Valve'
  ]
};

export default function PurchaseEntryForm({ 
  vendor, 
  category, 
  onSave, 
  onCancel, 
  isLoading = false 
}: PurchaseEntryFormProps) {
  const [formData, setFormData] = useState<PurchaseEntryData>({
    vendorId: vendor?.id || '',
    category: category,
    itemName: '',
    itemDescription: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    notes: ''
  });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vendor) {
      setFormData(prev => ({ ...prev, vendorId: vendor.id }));
    }
    fetchVendors();
    generateInvoiceNumber();
  }, [vendor, category]);

  const generateInvoiceNumber = async () => {
    try {
      const response = await fetch('/api/vendors/invoice-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          vendorId: vendor?.id || '',
          categorySlug: category
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, invoiceNumber: data.invoiceNumber }));
      } else {
        console.error('Invoice generation failed:', response.status);
        throw new Error('Failed to generate invoice number');
      }
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to timestamp-based generation
      const timestamp = Date.now().toString().slice(-8);
      const prefix = category === 'cylinder-purchase' ? 'CYL' :
                    category === 'gas-purchase' ? 'GAS' :
                    category === 'vaporizer-purchase' ? 'VAP' :
                    category === 'accessories-purchase' ? 'ACC' :
                    category === 'valves-purchase' ? 'VAL' : 'VEN';
      setFormData(prev => ({ ...prev, invoiceNumber: `${prefix}-${timestamp}` }));
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`/api/vendors/categories/${category.toLowerCase().replace('_', '-')}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const calculateTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const handleInputChange = (field: keyof PurchaseEntryData, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate total when quantity or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        newData.totalPrice = calculateTotal(
          field === 'quantity' ? Number(value) : newData.quantity,
          field === 'unitPrice' ? Number(value) : newData.unitPrice
        );
      }
      
      return newData;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendorId) {
      newErrors.vendorId = 'Please select a vendor';
    }
    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (formData.unitPrice <= 0) {
      newErrors.unitPrice = 'Unit price must be greater than 0';
    }
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const availableItems = categoryItems[category as keyof typeof categoryItems] || [];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">New Purchase Entry</h2>
            <p className="text-sm text-gray-600">{category.replace(/_/g, ' ').replace(/-/g, ' ')}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor *
            </label>
            <Select
              value={formData.vendorId}
              onChange={(e) => handleInputChange('vendorId', e.target.value)}
              disabled={!!vendor}
            >
              <option value="">Select a vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.companyName} ({v.vendorCode})
                </option>
              ))}
            </Select>
            {errors.vendorId && (
              <p className="text-red-600 text-sm mt-1">{errors.vendorId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.purchaseDate && (
              <p className="text-red-600 text-sm mt-1">{errors.purchaseDate}</p>
            )}
          </div>
        </div>

        {/* Item Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <Select
              value={formData.itemName}
              onChange={(e) => handleInputChange('itemName', e.target.value)}
            >
              <option value="">Select an item</option>
              {availableItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            {errors.itemName && (
              <p className="text-red-600 text-sm mt-1">{errors.itemName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={formData.invoiceNumber}
                readOnly
                placeholder="Auto-generated"
                className="pl-10 bg-gray-50 text-gray-900 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Invoice number is automatically generated
            </p>
          </div>
        </div>

        {/* Item Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Description
          </label>
          <Textarea
            value={formData.itemDescription}
            onChange={(e) => handleInputChange('itemDescription', e.target.value)}
            placeholder="Enter item description or additional details"
            rows={3}
          />
        </div>

        {/* Quantity and Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
            />
            {errors.quantity && (
              <p className="text-red-600 text-sm mt-1">{errors.quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Price (PKR) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-10"
              />
            </div>
            {errors.unitPrice && (
              <p className="text-red-600 text-sm mt-1">{errors.unitPrice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Price (PKR)
            </label>
            <div className="relative">
              <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="number"
                value={formData.totalPrice}
                onChange={(e) => handleInputChange('totalPrice', parseFloat(e.target.value) || 0)}
                className="pl-10 bg-gray-50"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Enter any additional notes or comments"
            rows={2}
          />
        </div>

        {/* Total Display */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">Total Amount:</span>
            <span className="text-2xl font-bold text-blue-600">
              PKR {formData.totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading ? 'Saving...' : 'Save Purchase Entry'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
