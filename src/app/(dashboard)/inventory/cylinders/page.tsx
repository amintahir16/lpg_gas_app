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

  useEffect(() => {
    fetchCylinders();
    fetchCylinderTypeStats();
  }, [searchTerm, statusFilter, typeFilter, locationFilter]);

  const fetchCylinders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter === 'ALL' ? '' : statusFilter,
        type: typeFilter === 'ALL' ? '' : typeFilter,
        location: locationFilter === 'ALL' ? '' : locationFilter
      });

      const response = await fetch(`/api/inventory/cylinders?${params}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCylinders(data.cylinders);
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
      case 'MAINTENANCE':
        return 'destructive';
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create cylinder');
      }

      const result = await response.json();
      console.log('Cylinder created successfully:', result);
      
      await fetchCylinders();
      setShowAddForm(false);
      alert('Cylinder added successfully!');
    } catch (error) {
      console.error('Failed to add cylinder:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to add cylinder'}`);
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

      fetchCylinders();
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
              <div className="text-2xl font-bold text-gray-900 mb-2">{stat.total}</div>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">{stat.full} Full</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-orange-600 font-medium">{stat.empty} Empty</span>
                </div>
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
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="FULL">Full</option>
              <option value="EMPTY">Empty</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="WITH_CUSTOMER">With Customer</option>
              <option value="RETIRED">Retired</option>
            </Select>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="DOMESTIC_11_8KG">Domestic (11.8kg)</option>
              <option value="STANDARD_15KG">Standard (15kg)</option>
              <option value="COMMERCIAL_45_4KG">Commercial (45.4kg)</option>
            </Select>
            <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="ALL">All Locations</option>
              <option value="STORE">In Store</option>
              <option value="VEHICLE">In Vehicle</option>
              <option value="CUSTOMER">With Customer</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cylinders Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Cylinders Inventory ({cylinders.length} total)
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
                const form = e.currentTarget;
                const formData = {
                  cylinderType: form.cylinderType.value,
                  capacity: parseFloat(form.capacity.value),
                  currentStatus: form.currentStatus.value,
                  location: form.location.value,
                  purchaseDate: form.purchaseDate.value || null,
                  purchasePrice: form.purchasePrice.value ? parseFloat(form.purchasePrice.value) : null
                };
                handleAddCylinder(formData);
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cylinder Type</label>
                  <Select name="cylinderType" required>
                    <option value="DOMESTIC_11_8KG">Domestic (11.8kg)</option>
                    <option value="STANDARD_15KG">Standard (15kg)</option>
                    <option value="COMMERCIAL_45_4KG">Commercial (45.4kg)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <Select name="currentStatus" required>
                    <option value="FULL">Full</option>
                    <option value="EMPTY">Empty</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </Select>
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
                  <Select name="cylinderType" defaultValue={selectedCylinder.cylinderType} required>
                    <option value="DOMESTIC_11_8KG">Domestic (11.8kg)</option>
                    <option value="STANDARD_15KG">Standard (15kg)</option>
                    <option value="COMMERCIAL_45_4KG">Commercial (45.4kg)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (KG)</label>
                  <Input name="capacity" type="number" defaultValue={selectedCylinder.capacity} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <Select name="currentStatus" defaultValue={selectedCylinder.currentStatus} required>
                    <option value="FULL">Full</option>
                    <option value="EMPTY">Empty</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="WITH_CUSTOMER">With Customer</option>
                    <option value="RETIRED">Retired</option>
                  </Select>
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
