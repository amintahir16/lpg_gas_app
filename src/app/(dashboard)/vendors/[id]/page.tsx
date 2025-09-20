'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  DollarSign,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  Building
} from 'lucide-react';
import VendorFinancialReport from '@/components/VendorFinancialReport';
import PurchaseEntryForm from '@/components/forms/PurchaseEntryForm';

interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  category: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms: number;
  isActive: boolean;
  createdAt: string;
  purchaseEntries?: PurchaseEntry[];
  financialReports?: FinancialReport[];
}

interface PurchaseEntry {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
  status: string;
  invoiceNumber?: string;
  notes?: string;
}

interface FinancialReport {
  id: string;
  reportDate: string;
  netBalance: number;
  cashIn: number;
  cashOut: number;
}

export default function VendorDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const vendorId = params.id as string;
  const action = searchParams.get('action');
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
    }
  }, [vendorId]);

  useEffect(() => {
    if (action === 'purchase') {
      setShowPurchaseForm(true);
    }
  }, [action]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vendors/${vendorId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vendor details');
      }

      const data = await response.json();
      setVendor(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendor details');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseEntry = async (formData: any) => {
    try {
      // Convert category to API format if needed
      const apiFormData = {
        ...formData,
        category: formData.category.replace('-', '_').toUpperCase()
      };

      const response = await fetch('/api/vendors/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiFormData),
      });

      if (!response.ok) {
        throw new Error('Failed to create purchase entry');
      }

      // Refresh vendor details to show new purchase
      fetchVendorDetails();
      setShowPurchaseForm(false);
      
      // Refresh vendor dashboard stats if available
      if ((window as any).refreshVendorStats) {
        (window as any).refreshVendorStats();
      }
    } catch (err) {
      console.error('Failed to create purchase entry:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Error: {error || 'Vendor not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/vendors/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.companyName}</h1>
            <p className="text-gray-600">{vendor.vendorCode} • {vendor.category?.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Vendor
          </Button>
          <Button 
            onClick={() => setShowPurchaseForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Purchase
          </Button>
        </div>
      </div>

      {/* Vendor Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{vendor.companyName}</p>
                <p className="text-sm text-gray-500">{vendor.vendorCode}</p>
              </div>
            </div>
            
            {vendor.contactPerson && (
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{vendor.contactPerson}</p>
                  <p className="text-sm text-gray-500">Contact Person</p>
                </div>
              </div>
            )}
            
            {vendor.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <p className="text-sm">{vendor.email}</p>
              </div>
            )}
            
            {vendor.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <p className="text-sm">{vendor.phone}</p>
              </div>
            )}
            
            {vendor.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <p className="text-sm">{vendor.address}</p>
              </div>
            )}
            
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Terms:</span>
                <span className="text-sm font-medium">{vendor.paymentTerms} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={vendor.isActive ? "default" : "secondary"}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Purchases */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Purchases</h3>
          <div className="space-y-3">
            {vendor.purchaseEntries && vendor.purchaseEntries.length > 0 ? (
              vendor.purchaseEntries.slice(0, 5).map((purchase) => (
                <div key={purchase.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{purchase.itemName}</p>
                    <p className="text-sm text-gray-600">
                      {purchase.quantity} units × {formatCurrency(purchase.unitPrice)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(purchase.totalPrice)}
                    </p>
                    <Badge className={`text-xs ${getStatusBadgeColor(purchase.status)}`}>
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No purchases found</p>
            )}
          </div>
        </Card>

        {/* Financial Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          {vendor.financialReports && vendor.financialReports.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Balance:</span>
                <span className={`font-semibold ${
                  Number(vendor.financialReports[0].netBalance) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(vendor.financialReports[0].netBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cash In:</span>
                <span className="text-sm text-green-600">
                  {formatCurrency(vendor.financialReports[0].cashIn)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cash Out:</span>
                <span className="text-sm text-red-600">
                  {formatCurrency(vendor.financialReports[0].cashOut)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No financial data available</p>
          )}
        </Card>
      </div>

      {/* Financial Report */}
      <VendorFinancialReport vendorId={vendorId} vendorName={`${vendor.companyName} - Financial Report`} />

      {/* Purchase Entry Modal */}
      {showPurchaseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <PurchaseEntryForm
              vendor={vendor}
              category={vendor.category || 'CYLINDER_PURCHASE'}
              onSave={handlePurchaseEntry}
              onCancel={() => setShowPurchaseForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
