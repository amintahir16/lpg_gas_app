"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  paymentTerms: number;
  isActive: boolean;
}

interface VendorsResponse {
  vendors: Vendor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function VendorsPage() {
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
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return;
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchTerm]);

  const fetchVendors = async () => {
    try {
      // Only show loading spinner on initial load, not during search
      if (vendors.length === 0) {
        setLoading(true);
      }
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/vendors?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const data: VendorsResponse = await response.json();
      setVendors(data.vendors);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [debouncedSearchTerm, pagination.page]);

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowEditForm(true);
  };

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowViewModal(true);
  };

  const handleUpdateVendor = async (formData: any) => {
    if (!selectedVendor) return;
    
    try {
      const response = await fetch('/api/vendors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedVendor.id,
          ...formData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update vendor');
      }

      // Refresh vendors after updating
      fetchVendors();
      setShowEditForm(false);
      setSelectedVendor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    }
  };

  const handleAddVendor = async (formData: any) => {
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create vendor');
      }

      // Refresh vendors after creating
      fetchVendors();
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-gray-600">Loading vendors...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-red-600">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600">Manage your suppliers and vendors</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/vendors/dashboard">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Vendor Dashboard</h3>
                <p className="text-gray-600">View categorized vendors and analytics</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/vendors/category/cylinder-purchase">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Category Management</h3>
                <p className="text-gray-600">Manage vendors by categories</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Vendor Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          { name: 'Total Vendors', value: vendors.length },
          { name: 'Active Vendors', value: vendors.filter(v => v.isActive).length },
          { name: 'Inactive Vendors', value: vendors.filter(v => !v.isActive).length },
        ].map((stat) => (
          <Card key={stat.name} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">🏢</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      {/* Vendors Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Terms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No vendors found. Add your first vendor to get started.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vendor.vendorCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendor.companyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vendor.contactPerson}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vendor.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vendor.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vendor.paymentTerms} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={vendor.isActive ? 'success' : 'destructive'} className="font-semibold">
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditVendor(vendor)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewVendor(vendor)}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} vendors
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

      {/* Add Vendor Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Vendor</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleAddVendor({
                companyName: formData.get('companyName'),
                contactPerson: formData.get('contactPerson'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                taxId: formData.get('taxId'),
                paymentTerms: formData.get('paymentTerms')
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                <Input name="companyName" type="text" placeholder="Company Name" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                <Input name="contactPerson" type="text" placeholder="Contact Person" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <Input name="email" type="email" placeholder="Email" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <Input name="phone" type="tel" placeholder="Phone" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <Input name="address" type="text" placeholder="Address" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tax ID</label>
                <Input name="taxId" type="text" placeholder="Tax ID" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Terms (Days)</label>
                <Input name="paymentTerms" type="number" placeholder="30" />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Add Vendor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {showEditForm && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Vendor</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedVendor(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleUpdateVendor({
                companyName: formData.get('companyName'),
                contactPerson: formData.get('contactPerson'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                taxId: formData.get('taxId'),
                paymentTerms: formData.get('paymentTerms')
              });
            }}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                <Input 
                  name="companyName" 
                  type="text" 
                  defaultValue={selectedVendor.companyName}
                  placeholder="Company Name" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                <Input 
                  name="contactPerson" 
                  type="text" 
                  defaultValue={selectedVendor.contactPerson || ''}
                  placeholder="Contact Person" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <Input 
                  name="email" 
                  type="email" 
                  defaultValue={selectedVendor.email || ''}
                  placeholder="Email" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <Input 
                  name="phone" 
                  type="tel" 
                  defaultValue={selectedVendor.phone || ''}
                  placeholder="Phone" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <Input 
                  name="address" 
                  type="text" 
                  defaultValue={selectedVendor.address || ''}
                  placeholder="Address" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tax ID</label>
                <Input 
                  name="taxId" 
                  type="text" 
                  defaultValue={selectedVendor.taxId || ''}
                  placeholder="Tax ID" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Terms (Days)</label>
                <Input 
                  name="paymentTerms" 
                  type="number" 
                  defaultValue={selectedVendor.paymentTerms?.toString() || ''}
                  placeholder="30" 
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedVendor(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Update Vendor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Vendor Modal */}
      {showViewModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Vendor Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedVendor(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Code</label>
                <p className="text-gray-900 font-mono">{selectedVendor.vendorCode}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name</label>
                <p className="text-gray-900">{selectedVendor.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Person</label>
                <p className="text-gray-900">{selectedVendor.contactPerson || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{selectedVendor.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{selectedVendor.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{selectedVendor.address || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tax ID</label>
                <p className="text-gray-900">{selectedVendor.taxId || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Terms</label>
                <p className="text-gray-900">{selectedVendor.paymentTerms ? `${selectedVendor.paymentTerms} days` : 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <Badge variant={selectedVendor.isActive ? 'success' : 'destructive'} className="font-semibold">
                  {selectedVendor.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedVendor(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 