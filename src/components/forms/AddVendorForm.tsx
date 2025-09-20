'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  X, 
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';

interface AddVendorFormProps {
  category: string;
  onSave: (data: VendorData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface VendorData {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms: number;
  category: string;
}

const categoryLabels = {
  'cylinder-purchase': 'Cylinder Purchase',
  'gas-purchase': 'Gas Purchase',
  'vaporizer-purchase': 'Vaporizer Purchase',
  'accessories-purchase': 'Accessories Purchase',
  'valves-purchase': 'Valves Purchase'
};

export default function AddVendorForm({ 
  category, 
  onSave, 
  onCancel, 
  isLoading = false 
}: AddVendorFormProps) {
  const [formData, setFormData] = useState<VendorData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    paymentTerms: 30,
    category: category
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof VendorData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (formData.paymentTerms < 0) {
      newErrors.paymentTerms = 'Payment terms must be a positive number';
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

  const categoryLabel = categoryLabels[category as keyof typeof categoryLabels] || category;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add New Vendor</h2>
            <p className="text-sm text-gray-600">{categoryLabel}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
                className="pl-10"
              />
            </div>
            {errors.companyName && (
              <p className="text-red-600 text-sm mt-1">{errors.companyName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                placeholder="Enter contact person name"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className="pl-10"
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                className="pl-10"
              />
            </div>
            {errors.phone && (
              <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
            <Textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter company address"
              className="pl-10"
              rows={3}
            />
          </div>
        </div>

        {/* Business Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax ID
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="Enter tax ID"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Terms (Days)
            </label>
            <Input
              type="number"
              min="0"
              value={formData.paymentTerms}
              onChange={(e) => handleInputChange('paymentTerms', parseInt(e.target.value) || 0)}
              placeholder="30"
            />
            {errors.paymentTerms && (
              <p className="text-red-600 text-sm mt-1">{errors.paymentTerms}</p>
            )}
          </div>
        </div>

        {/* Category Display */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">Category:</span>
            <Badge className="bg-blue-100 text-blue-800">
              {categoryLabel}
            </Badge>
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
            {isLoading ? 'Saving...' : 'Add Vendor'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
