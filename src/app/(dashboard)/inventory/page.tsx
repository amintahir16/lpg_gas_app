"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Cylinder {
  id: string;
  code: string;
  cylinderType: string;
  capacity: number;
  currentStatus: string;
  location: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
}

interface CylindersResponse {
  cylinders: Cylinder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function InventoryPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCylinder, setSelectedCylinder] = useState<Cylinder | null>(null);
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Debounce search term
  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return; // Only reset when debounced term is set
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearchTerm]);

  const fetchCylinders = async () => {
    try {
      // Only show loading spinner on initial load, not during search
      if (cylinders.length === 0) {
        setLoading(true);
      }
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        status: statusFilter === 'ALL' ? '' : statusFilter,
        type: typeFilter === 'ALL' ? '' : typeFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/cylinders?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cylinders');
      }

      const data: CylindersResponse = await response.json();
      setCylinders(data.cylinders);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cylinders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCylinders();
  }, [debouncedSearchTerm, statusFilter, typeFilter, pagination.page]);

  const handleAddCylinder = async (formData: any) => {
    try {
      const response = await fetch('/api/cylinders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create cylinder');
      }

      // Refresh cylinders after creating
      fetchCylinders();
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cylinder');
    }
  };

  const handleEditCylinder = async (formData: any) => {
    if (!selectedCylinder) return;
    
    try {
      const response = await fetch('/api/cylinders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedCylinder.id,
          ...formData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cylinder');
      }

      // Refresh cylinders after updating
      fetchCylinders();
      setShowEditForm(false);
      setSelectedCylinder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cylinder');
    }
  };

  const handleViewCylinder = (cylinder: Cylinder) => {
    setSelectedCylinder(cylinder);
    setShowViewModal(true);
  };

  const handleEditClick = (cylinder: Cylinder) => {
    setSelectedCylinder(cylinder);
    setShowEditForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'RENTED':
        return 'info';
      case 'MAINTENANCE':
        return 'warning';
      case 'RETIRED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const stats = {
    total: cylinders.length,
    available: cylinders.filter(c => c.currentStatus === 'AVAILABLE').length,
    rented: cylinders.filter(c => c.currentStatus === 'RENTED').length,
    maintenance: cylinders.filter(c => c.currentStatus === 'MAINTENANCE').length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-gray-600 font-medium">Loading cylinders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-red-600 font-medium">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Track and manage LPG gas cylinders
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Cylinder
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Cylinders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">In inventory</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.available}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Ready for rental</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Rented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.rented}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Currently out</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.maintenance}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Under service</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search cylinders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            onFocus={(e) => e.target.select()}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="RENTED">Rented</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="RETIRED">Retired</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="KG_15">15KG</option>
          <option value="KG_45">45KG</option>
        </Select>
      </div>

      {/* Cylinders Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cylinder Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Next Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cylinders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No cylinders found. Add your first cylinder to get started.
                    </td>
                  </tr>
                ) : (
                  cylinders.map((cylinder) => (
                    <tr key={cylinder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{cylinder.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className="font-semibold">
                          {cylinder.cylinderType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.capacity} KG
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(cylinder.currentStatus) as any} className="font-semibold">
                          {cylinder.currentStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.lastMaintenanceDate ? new Date(cylinder.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.nextMaintenanceDate ? new Date(cylinder.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditClick(cylinder)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewCylinder(cylinder)}
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
            {pagination.total} cylinders
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

      {/* Add Cylinder Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Cylinder</h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddCylinder({
                  cylinderType: formData.get('cylinderType'),
                  capacity: formData.get('capacity'),
                  location: formData.get('location'),
                  purchaseDate: formData.get('purchaseDate'),
                  purchasePrice: formData.get('purchasePrice')
                });
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cylinder Type</label>
                  <Select name="cylinderType" required>
                    <option value="KG_15">15KG</option>
                    <option value="KG_45">45KG</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (KG)</label>
                  <Input name="capacity" type="number" placeholder="15" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <Input name="location" type="text" placeholder="Warehouse A" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Date</label>
                  <Input name="purchaseDate" type="date" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price</label>
                  <Input name="purchasePrice" type="number" placeholder="0.00" step="0.01" />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Cylinder
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cylinder Modal */}
      {showEditForm && selectedCylinder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Cylinder</h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEditCylinder({
                  cylinderType: formData.get('cylinderType'),
                  capacity: formData.get('capacity'),
                  location: formData.get('location'),
                  currentStatus: formData.get('currentStatus'),
                  purchaseDate: formData.get('purchaseDate'),
                  purchasePrice: formData.get('purchasePrice'),
                  lastMaintenanceDate: formData.get('lastMaintenanceDate'),
                  nextMaintenanceDate: formData.get('nextMaintenanceDate')
                });
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cylinder Type</label>
                  <Select name="cylinderType" defaultValue={selectedCylinder.cylinderType} required>
                    <option value="KG_15">15KG</option>
                    <option value="KG_45">45KG</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (KG)</label>
                  <Input name="capacity" type="number" defaultValue={selectedCylinder.capacity} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <Input name="location" type="text" defaultValue={selectedCylinder.location} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <Select name="currentStatus" defaultValue={selectedCylinder.currentStatus} required>
                    <option value="AVAILABLE">Available</option>
                    <option value="RENTED">Rented</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="RETIRED">Retired</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Date</label>
                  <Input 
                    name="purchaseDate" 
                    type="date" 
                    defaultValue={selectedCylinder.purchaseDate ? new Date(selectedCylinder.purchaseDate).toISOString().split('T')[0] : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price</label>
                  <Input 
                    name="purchasePrice" 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01"
                    defaultValue={selectedCylinder.purchasePrice || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Maintenance Date</label>
                  <Input 
                    name="lastMaintenanceDate" 
                    type="date"
                    defaultValue={selectedCylinder.lastMaintenanceDate ? new Date(selectedCylinder.lastMaintenanceDate).toISOString().split('T')[0] : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Next Maintenance Date</label>
                  <Input 
                    name="nextMaintenanceDate" 
                    type="date"
                    defaultValue={selectedCylinder.nextMaintenanceDate ? new Date(selectedCylinder.nextMaintenanceDate).toISOString().split('T')[0] : ''}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedCylinder(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Cylinder
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Cylinder Modal */}
      {showViewModal && selectedCylinder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cylinder Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Cylinder Code</label>
                  <p className="text-sm text-gray-900 font-medium">{selectedCylinder.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Type</label>
                  <Badge variant="secondary" className="font-semibold">
                    {selectedCylinder.cylinderType}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Capacity</label>
                  <p className="text-sm text-gray-900">{selectedCylinder.capacity} KG</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{selectedCylinder.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Status</label>
                  <Badge variant={getStatusColor(selectedCylinder.currentStatus) as any} className="font-semibold">
                    {selectedCylinder.currentStatus}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Last Maintenance</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.lastMaintenanceDate 
                      ? new Date(selectedCylinder.lastMaintenanceDate).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Next Maintenance</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.nextMaintenanceDate 
                      ? new Date(selectedCylinder.nextMaintenanceDate).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCylinder(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowEditForm(true);
                  }}
                >
                  Edit Cylinder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 