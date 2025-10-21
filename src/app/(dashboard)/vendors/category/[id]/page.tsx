"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  MapPinIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  totalBalance: number;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function CategoryVendorsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params?.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingVendor, setDeletingVendor] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchCategory();
    fetchVendors();
  }, [categoryId]);

  useEffect(() => {
    const filtered = vendors.filter(vendor =>
      (vendor.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      vendor.vendorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVendors(filtered);
  }, [searchTerm, vendors]);

  const fetchCategory = async () => {
    try {
      const response = await fetch('/api/vendor-categories');
      if (!response.ok) throw new Error('Failed to fetch category');
      const data = await response.json();
      const cat = data.categories.find((c: Category) => c.id === categoryId);
      setCategory(cat || null);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`/api/vendors?categoryId=${categoryId}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch vendors');
      }
      const data = await response.json();
      console.log('Vendors fetched:', data);
      setVendors(data.vendors || []);
      setFilteredVendors(data.vendors || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      alert('Error loading vendors. Please check console and ensure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          categoryId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create vendor');
        return;
      }

      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: ''
      });
      setShowAddForm(false);
      fetchVendors();
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/vendors?id=${vendorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete vendor');
        return;
      }

      setDeletingVendor(null);
      setShowDeleteConfirm(false);
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  const confirmDeleteVendor = (vendorId: string) => {
    setDeletingVendor(vendorId);
    setShowDeleteConfirm(true);
  };

  const cancelDeleteVendor = () => {
    setDeletingVendor(null);
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading vendors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/vendors" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Categories
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {category?.name || 'Vendors'}
        </h1>
        {category?.description && (
          <p className="text-gray-600">{category.description}</p>
        )}
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Vendor
        </Button>
      </div>

      {/* Add Vendor Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Khattak Plant, Ali Dealer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit">Create Vendor</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      name: '',
                      contactPerson: '',
                      phone: '',
                      email: '',
                      address: ''
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vendors List */}
      {filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BuildingOfficeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No vendors found' : 'No vendors yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first vendor in this category'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowAddForm(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Add First Vendor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <Link href={`/vendors/${vendor.id}`} className="block">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600">
                        {vendor.name || vendor.companyName || 'Unnamed Vendor'}
                      </h3>
                      <p className="text-sm text-gray-500">{vendor.vendorCode}</p>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    {vendor.totalBalance > 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        Outstanding
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        confirmDeleteVendor(vendor.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                  {(vendor.contactPerson || vendor.phone || vendor.address) && (
                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      {vendor.contactPerson && (
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4" />
                          {vendor.contactPerson}
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="w-4 h-4" />
                          <span className="line-clamp-1">{vendor.address}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total Purchases</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(vendor.totalPurchases)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Paid</div>
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(vendor.totalPaid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Balance</div>
                      <div className={`text-sm font-semibold ${vendor.totalBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatCurrency(vendor.totalBalance)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && deletingVendor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Vendor
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete this vendor? This action cannot be undone.
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={cancelDeleteVendor}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteVendor(deletingVendor)}
                  >
                    Delete Vendor
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

