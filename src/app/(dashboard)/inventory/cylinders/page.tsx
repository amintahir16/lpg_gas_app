"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ArrowLeftIcon,
  ChartBarIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

interface Cylinder {
  id: string;
  code: string;
  cylinderType: string;
  capacity: number;
  currentStatus: string;
  location: string;
  storeId?: string;
  vehicleId?: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  store?: {
    name: string;
  };
  vehicle?: {
    vehicleNumber: string;
    driverName: string;
  };
}

interface CylinderTypeStats {
  type: string;
  full: number;
  empty: number;
  maintenance: number;
  withCustomer: number;
  retired: number;
  total: number;
}

export default function CylindersInventoryPage() {
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [cylinderTypeStats, setCylinderTypeStats] = useState<CylinderTypeStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCylinder, setSelectedCylinder] = useState<Cylinder | null>(null);
  const [isAddingCylinder, setIsAddingCylinder] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    // Reset to page 1 when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCylinderTypeStats();
  }, [searchTerm, statusFilter, typeFilter, locationFilter]);

  useEffect(() => {
    fetchCylinders();
  }, [pagination.page, searchTerm, statusFilter, typeFilter, locationFilter]);

  const fetchCylinders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter === 'ALL' ? '' : statusFilter,
        type: typeFilter === 'ALL' ? '' : typeFilter,
        location: locationFilter === 'ALL' ? '' : locationFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/inventory/cylinders?${params}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCylinders(data.cylinders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch cylinders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCylinderTypeStats = async () => {
    try {
      const response = await fetch('/api/inventory/cylinders/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCylinderTypeStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch cylinder type stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULL':
        return 'success';
      case 'EMPTY':
        return 'warning';
      case 'WITH_CUSTOMER':
        return 'info';
      case 'RETIRED':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'DOMESTIC_11_8KG':
        return 'Domestic (11.8kg)';
      case 'STANDARD_15KG':
        return 'Standard (15kg)';
      case 'COMMERCIAL_45_4KG':
        return 'Commercial (45.4kg)';
      default:
        return type;
    }
  };

  const getLocationDisplay = (cylinder: Cylinder) => {
    if (cylinder.store) {
      return `Store: ${cylinder.store.name}`;
    }
    if (cylinder.vehicle) {
      return `Vehicle: ${cylinder.vehicle.vehicleNumber}`;
    }
    return cylinder.location || 'Not assigned';
  };

  const handleEditCylinder = (cylinder: Cylinder) => {
    setSelectedCylinder(cylinder);
    setShowEditForm(true);
  };

  const handleViewCylinder = (cylinder: Cylinder) => {
    setSelectedCylinder(cylinder);
    setShowViewModal(true);
  };

  const handleAddCylinder = async (formData: any) => {
    if (isAddingCylinder) return; // Prevent multiple submissions
    
    setIsAddingCylinder(true);
    try {
      console.log('Submitting cylinder data:', formData);
      
      const response = await fetch('/api/inventory/cylinders', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to create cylinder');
      }

      const result = await response.json();
      console.log('Cylinder created successfully:', result);
      
      // Refresh both cylinders list and statistics
      await Promise.all([
        fetchCylinders(),
        fetchCylinderTypeStats()
      ]);
      
      setShowAddForm(false);
      alert('Cylinder added successfully!');
    } catch (error) {
      console.error('Failed to add cylinder:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to add cylinder'}`);
    } finally {
      setIsAddingCylinder(false);
    }
  };

  const handleUpdateCylinder = async (formData: any) => {
    if (!selectedCylinder) return;
    
    try {
      const response = await fetch(`/api/inventory/cylinders/${selectedCylinder.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update cylinder');
      }

      // Refresh both cylinders list and statistics
      await Promise.all([
        fetchCylinders(),
        fetchCylinderTypeStats()
      ]);
      
      setShowEditForm(false);
      setSelectedCylinder(null);
    } catch (error) {
      console.error('Failed to update cylinder:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/inventory'}
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cylinders Inventory</h1>
            <p className="mt-2 text-gray-600 font-medium">
              Total cylinders inventory by type and status
            </p>
          </div>
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

      {/* Type Statistics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {cylinderTypeStats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">
                {getTypeDisplayName(stat.type)}
              </CardTitle>
              <CubeIcon className="w-5 h-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-3">{stat.total}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Full</span>
                  </div>
                  <span className="font-semibold text-gray-700">{stat.full}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-orange-600 font-medium">Empty</span>
                  </div>
                  <span className="font-semibold text-gray-700">{stat.empty}</span>
                </div>
                {stat.retired > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-600 font-medium">Retired</span>
                    </div>
                    <span className="font-semibold text-gray-700">{stat.retired}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search cylinders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="FULL">Full</option>
              <option value="EMPTY">Empty</option>
              <option value="RETIRED">Retired</option>
            </select>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="DOMESTIC_11_8KG">Domestic (11.8kg)</option>
              <option value="STANDARD_15KG">Standard (15kg)</option>
              <option value="COMMERCIAL_45_4KG">Commercial (45.4kg)</option>
            </select>
            <select 
              value={locationFilter} 
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Locations</option>
              <option value="STORE">In Store</option>
              <option value="VEHICLE">In Vehicle</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Cylinders Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Cylinders Inventory ({pagination.total} total)
          </CardTitle>
        </CardHeader>
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="animate-pulse">Loading cylinders...</div>
                    </td>
                  </tr>
                ) : cylinders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No cylinders found matching your criteria.
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
                          {getTypeDisplayName(cylinder.cylinderType)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(cylinder.currentStatus) as any} className="font-semibold">
                          {cylinder.currentStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {getLocationDisplay(cylinder)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.purchaseDate ? new Date(cylinder.purchaseDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cylinder.lastMaintenanceDate ? new Date(cylinder.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditCylinder(cylinder)}
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
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} cylinders
              </span>
              <div className="flex items-center space-x-2">
                <label htmlFor="pageSize" className="text-sm text-gray-700">Show:</label>
                <select
                  id="pageSize"
                  value={pagination.limit}
                  onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                  className="px-2 py-1 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Cylinder Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Cylinder</h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                console.log('Form submitted!');
                
                try {
                  const form = e.currentTarget;
                  console.log('Form element:', form);
                  
                  // Get form values
                  const cylinderCode = form.cylinderCode?.value;
                  const cylinderType = form.cylinderType?.value;
                  const currentStatus = form.currentStatus?.value;
                  const location = form.location?.value;
                  const purchaseDate = form.purchaseDate?.value;
                  const purchasePrice = form.purchasePrice?.value;
                  
                  console.log('Raw form values:', {
                    cylinderCode,
                    cylinderType,
                    currentStatus,
                    location,
                    purchaseDate,
                    purchasePrice
                  });
                  
                  // Validate required fields
                  if (!cylinderCode) {
                    alert('Please enter a cylinder code');
                    return;
                  }
                  
                  if (!cylinderType) {
                    alert('Please select a cylinder type');
                    return;
                  }
                  
                  if (!currentStatus) {
                    alert('Please select a status');
                    return;
                  }
                  
                  if (!location) {
                    alert('Please enter a location');
                    return;
                  }
                  
                  // Calculate capacity based on cylinder type
                  let capacity = 0;
                  switch (cylinderType) {
                    case 'DOMESTIC_11_8KG':
                      capacity = 11.8;
                      break;
                    case 'STANDARD_15KG':
                      capacity = 15.0;
                      break;
                    case 'COMMERCIAL_45_4KG':
                      capacity = 45.4;
                      break;
                    default:
                      capacity = 15.0; // default
                  }
                  
                  const formData = {
                    code: cylinderCode,
                    cylinderType,
                    capacity,
                    currentStatus,
                    location,
                    purchaseDate: purchaseDate || null,
                    purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null
                  };
                  
                  console.log('Form data to submit:', formData);
                  handleAddCylinder(formData);
                } catch (error) {
                  console.error('Form submission error:', error);
                  alert('Error processing form. Please check the console for details.');
                }
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cylinder Code</label>
                  <Input 
                    name="cylinderCode" 
                    type="text" 
                    placeholder="e.g., CYL-001, ABC-123" 
                    required 
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cylinder Type</label>
                  <select 
                    name="cylinderType" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Cylinder Type</option>
                    <option value="DOMESTIC_11_8KG">Domestic (11.8kg)</option>
                    <option value="STANDARD_15KG">Standard (15kg)</option>
                    <option value="COMMERCIAL_45_4KG">Commercial (45.4kg)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    name="currentStatus"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Status</option>
                    <option value="FULL">Full</option>
                    <option value="EMPTY">Empty</option>
                  </select>
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
                    disabled={isAddingCylinder}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isAddingCylinder}
                    className="min-w-[120px]"
                    onClick={(e) => {
                      console.log('Add Cylinder button clicked');
                      // Let the form handle the submission, but also trigger it manually as backup
                      const form = e.currentTarget.closest('form');
                      if (form) {
                        console.log('Found form element, triggering submit');
                        // Don't prevent default, let the form handle it
                      }
                    }}
                  >
                    {isAddingCylinder ? 'Adding...' : 'Add Cylinder'}
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
                handleUpdateCylinder({
                  cylinderType: formData.get('cylinderType'),
                  capacity: formData.get('capacity'),
                  currentStatus: formData.get('currentStatus'),
                  location: formData.get('location'),
                  purchaseDate: formData.get('purchaseDate'),
                  purchasePrice: formData.get('purchasePrice'),
                  lastMaintenanceDate: formData.get('lastMaintenanceDate'),
                  nextMaintenanceDate: formData.get('nextMaintenanceDate')
                });
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cylinder Type</label>
                  <select 
                    name="cylinderType" 
                    defaultValue={selectedCylinder.cylinderType}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="DOMESTIC_11_8KG">Domestic (11.8kg)</option>
                    <option value="STANDARD_15KG">Standard (15kg)</option>
                    <option value="COMMERCIAL_45_4KG">Commercial (45.4kg)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (KG)</label>
                  <Input name="capacity" type="number" defaultValue={selectedCylinder.capacity} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    name="currentStatus"
                    defaultValue={selectedCylinder.currentStatus}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FULL">Full</option>
                    <option value="EMPTY">Empty</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <Input name="location" type="text" defaultValue={selectedCylinder.location} required />
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
                    {getTypeDisplayName(selectedCylinder.cylinderType)}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Capacity</label>
                  <p className="text-sm text-gray-900">{selectedCylinder.capacity} KG</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{getLocationDisplay(selectedCylinder)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Status</label>
                  <Badge variant={getStatusColor(selectedCylinder.currentStatus) as any} className="font-semibold">
                    {selectedCylinder.currentStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Purchase Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.purchaseDate ? new Date(selectedCylinder.purchaseDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Purchase Price</label>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedCylinder.purchasePrice ? `PKR ${selectedCylinder.purchasePrice.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Last Maintenance</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.lastMaintenanceDate ? new Date(selectedCylinder.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Next Maintenance</label>
                  <p className="text-sm text-gray-900">
                    {selectedCylinder.nextMaintenanceDate ? new Date(selectedCylinder.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
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
