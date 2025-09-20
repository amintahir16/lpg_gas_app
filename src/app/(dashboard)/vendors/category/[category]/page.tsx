'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  DollarSign,
  Calendar,
  Package,
  TrendingUp,
  Filter,
  ArrowLeft
} from 'lucide-react';
import AddVendorForm from '@/components/forms/AddVendorForm';

interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  category: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
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
}

interface FinancialReport {
  id: string;
  reportDate: string;
  netBalance: number;
  cashIn: number;
  cashOut: number;
}

const categoryInfo = {
  'cylinder-purchase': {
    label: 'Cylinder Purchase',
    icon: Package,
    color: 'bg-blue-500',
    description: 'Manage cylinder purchase vendors like Khattak Plant, Sui Gas, Ali Plant',
    items: ['Domestic (11.8kg) Cylinder', 'Standard (15kg) Cylinder', 'Commercial (45.4kg) Cylinder']
  },
  'gas-purchase': {
    label: 'Gas Purchase',
    icon: TrendingUp,
    color: 'bg-green-500',
    description: 'Manage gas purchase vendors like Ali Plant, Fata Plant, Unimax Plant',
    items: ['Domestic (11.8kg) Gas', 'Standard (15kg) Gas', 'Commercial (45.4kg) Gas']
  },
  'vaporizer-purchase': {
    label: 'Vaporizer Purchase',
    icon: Package,
    color: 'bg-purple-500',
    description: 'Manage vaporizer vendors like Iqbal Energy, Hass Vaporizer, Fakhar Vaporizer',
    items: ['20kg Vaporizer', '30kg Vaporizer', '40kg Vaporizer']
  },
  'accessories-purchase': {
    label: 'Accessories Purchase',
    icon: Package,
    color: 'bg-orange-500',
    description: 'Manage accessories vendors like Daud Reeta Bazar, Imtiaaz Reeta Bazar',
    items: ['Regulator', 'Stove', 'Pipe', 'High Pressure Regulator', 'Regulator Quality 1', 'Regulator Quality 2']
  },
  'valves-purchase': {
    label: 'Valves Purchase',
    icon: Package,
    color: 'bg-red-500',
    description: 'Manage valves and safety equipment vendors',
    items: ['Safety Valve', 'Check Valve', 'Control Valve', 'Relief Valve']
  }
};

export default function CategoryVendorPage() {
  const params = useParams();
  const category = params.category as string;
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchVendors();
  }, [debouncedSearchTerm, pagination.page, category]);

  const fetchVendors = async () => {
    try {
      if (vendors.length === 0) {
        setLoading(true);
      }
      
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/vendors/categories/${category}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const data = await response.json();
      setVendors(data.vendors);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleViewVendor = (vendor: Vendor) => {
    // Navigate to vendor details page
    window.location.href = `/vendors/${vendor.id}`;
  };

  const handleAddVendor = () => {
    setShowAddForm(true);
  };

  const handleSaveVendor = async (formData: any) => {
    try {
      const response = await fetch(`/api/vendors/categories/${category}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create vendor');
      }

      // Refresh vendors list
      fetchVendors();
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create vendor:', err);
    }
  };

  const handleNewPurchase = (vendor: Vendor) => {
    // Navigate to vendor details page with purchase form open
    window.location.href = `/vendors/${vendor.id}?action=purchase`;
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

  const categoryData = categoryInfo[category as keyof typeof categoryInfo];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
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
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-10 w-10 ${categoryData?.color} rounded-lg flex items-center justify-center`}>
                {categoryData?.icon && <categoryData.icon className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{categoryData?.label}</h1>
                <p className="text-gray-600">{categoryData?.description}</p>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={handleAddVendor} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Category Items Info */}
      {categoryData?.items && (
        <Card className="p-4 bg-blue-50">
          <h3 className="font-medium text-blue-900 mb-2">Available Items in this Category:</h3>
          <div className="flex flex-wrap gap-2">
            {categoryData.items.map((item, index) => (
              <Badge key={index} variant="outline" className="bg-white text-blue-700 border-blue-300">
                {item}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </Card>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <Card key={vendor.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{vendor.companyName}</h3>
                <p className="text-sm text-gray-500">{vendor.vendorCode}</p>
              </div>
              <Badge variant={vendor.isActive ? "default" : "secondary"}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              {vendor.contactPerson && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Contact:</span> {vendor.contactPerson}
                </p>
              )}
              {vendor.email && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {vendor.email}
                </p>
              )}
              {vendor.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {vendor.phone}
                </p>
              )}
            </div>

            {/* Recent Purchase Entry */}
            {vendor.purchaseEntries && vendor.purchaseEntries.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Recent Purchase</p>
                <div className="text-sm text-gray-600">
                  <p>{vendor.purchaseEntries[0].itemName}</p>
                  <p className="text-green-600 font-medium">
                    PKR {Number(vendor.purchaseEntries[0].totalPrice).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            {vendor.financialReports && vendor.financialReports.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Financial Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance:</span>
                  <span className={`font-medium ${
                    Number(vendor.financialReports[0].netBalance) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    PKR {Number(vendor.financialReports[0].netBalance).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleViewVendor(vendor)}
                className="flex items-center gap-1 flex-1"
              >
                <Eye className="h-3 w-3" />
                View
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleNewPurchase(vendor)}
                className="flex items-center gap-1 flex-1"
              >
                <Plus className="h-3 w-3" />
                Purchase
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center gap-1"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Empty State */}
      {vendors.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first vendor.'}
          </p>
          <Button onClick={handleAddVendor} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add First Vendor
          </Button>
        </Card>
      )}

      {/* Add Vendor Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AddVendorForm
              category={category}
              onSave={handleSaveVendor}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
