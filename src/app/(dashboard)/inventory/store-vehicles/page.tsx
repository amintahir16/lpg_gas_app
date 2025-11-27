"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  BuildingStorefrontIcon, 
  TruckIcon, 
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { getCylinderTypeDisplayName } from '@/lib/cylinder-utils';

interface Store {
  id: string;
  name: string;
  location: string;
  address?: string;
  isActive: boolean;
  cylinderCount: number;
  cylinders: {
    id: string;
    code: string;
    cylinderType: string;
    currentStatus: string;
  }[];
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName?: string;
  capacity?: number;
  isActive: boolean;
  cylinderCount: number;
  cylinders: {
    id: string;
    code: string;
    cylinderType: string;
    currentStatus: string;
  }[];
}

interface Cylinder {
  id: string;
  code: string;
  cylinderType: string;
  currentStatus: string;
  storeId?: string;
  vehicleId?: string;
  store?: { name: string };
  vehicle?: { vehicleNumber: string };
}

export default function StoreVehiclesInventoryPage() {
  const [activeTab, setActiveTab] = useState<'stores' | 'vehicles'>('stores');
  const [stores, setStores] = useState<Store[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Store | Vehicle | null>(null);

  useEffect(() => {
    if (activeTab === 'stores') {
      fetchStores();
    } else {
      fetchVehicles();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCylinders();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data.stores);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCylinders = async () => {
    try {
      const response = await fetch('/api/inventory/cylinders');
      if (response.ok) {
        const data = await response.json();
        setCylinders(data.cylinders);
      }
    } catch (error) {
      console.error('Failed to fetch cylinders:', error);
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
    return getCylinderTypeDisplayName(type);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.driverName && vehicle.driverName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewStore = (store: Store) => {
    setSelectedItem(store);
    setShowViewModal(true);
  };

  const handleEditStore = (store: Store) => {
    setSelectedItem(store);
    setShowEditForm(true);
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    setSelectedItem(vehicle);
    setShowViewModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedItem(vehicle);
    setShowEditForm(true);
  };

  const handleAddStore = async (formData: any) => {
    try {
      console.log('Submitting store data:', formData);
      
      const response = await fetch('/api/inventory/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create store');
      }

      const result = await response.json();
      console.log('Store created successfully:', result);
      
      await fetchStores();
      setShowAddForm(false);
      alert('Store added successfully!');
    } catch (error) {
      console.error('Failed to add store:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to add store'}`);
    }
  };

  const handleAddVehicle = async (formData: any) => {
    try {
      console.log('Submitting vehicle data:', formData);
      
      const response = await fetch('/api/inventory/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create vehicle');
      }

      const result = await response.json();
      console.log('Vehicle created successfully:', result);
      
      await fetchVehicles();
      setShowAddForm(false);
      alert('Vehicle added successfully!');
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to add vehicle'}`);
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
            <h1 className="text-3xl font-bold text-gray-900">Store & Vehicle Inventory</h1>
            <p className="mt-2 text-gray-600 font-medium">
              Manage inventory distribution across stores and vehicles
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add {activeTab === 'stores' ? 'Store' : 'Vehicle'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('stores')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stores'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BuildingStorefrontIcon className="w-5 h-5 inline mr-2" />
            Store Inventory ({stores.length})
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vehicles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TruckIcon className="w-5 h-5 inline mr-2" />
            Vehicle Inventory ({vehicles.length})
          </button>
        </nav>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Store Inventory */}
      {activeTab === 'stores' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-2">
              <div className="animate-pulse">Loading stores...</div>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="col-span-2 text-center py-8">
              <BuildingStorefrontIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No stores found.</p>
            </div>
          ) : (
            filteredStores.map((store) => (
              <Card key={store.id} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    <span>{store.name}</span>
                    <Badge variant={store.isActive ? 'success' : 'secondary'}>
                      {store.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600">{store.location}</p>
                  {store.address && (
                    <p className="text-xs text-gray-500">{store.address}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {store.cylinderCount}
                    </div>
                    <p className="text-sm text-gray-600">Cylinders in Store</p>
                  </div>
                  
                  {store.cylinders.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Cylinders:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {store.cylinders.map((cylinder) => (
                          <div key={cylinder.id} className="flex items-center justify-between text-xs">
                            <span className="font-medium">{cylinder.code}</span>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {getTypeDisplayName(cylinder.cylinderType)}
                              </Badge>
                              <Badge variant={getStatusColor(cylinder.currentStatus) as any} className="text-xs">
                                {cylinder.currentStatus.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewStore(store)}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditStore(store)}
                    >
                      Edit Store
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Vehicle Inventory */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-2">
              <div className="animate-pulse">Loading vehicles...</div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="col-span-2 text-center py-8">
              <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No vehicles found.</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    <span>{vehicle.vehicleNumber}</span>
                    <Badge variant={vehicle.isActive ? 'success' : 'secondary'}>
                      {vehicle.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600">{vehicle.vehicleType}</p>
                  {vehicle.driverName && (
                    <p className="text-xs text-gray-500 flex items-center">
                      <UserIcon className="w-3 h-3 mr-1" />
                      {vehicle.driverName}
                    </p>
                  )}
                  {vehicle.capacity && (
                    <p className="text-xs text-gray-500">Capacity: {vehicle.capacity} cylinders</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {vehicle.cylinderCount}
                    </div>
                    <p className="text-sm text-gray-600">Cylinders in Vehicle</p>
                  </div>
                  
                  {vehicle.cylinders.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Cylinders:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {vehicle.cylinders.map((cylinder) => (
                          <div key={cylinder.id} className="flex items-center justify-between text-xs">
                            <span className="font-medium">{cylinder.code}</span>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {getTypeDisplayName(cylinder.cylinderType)}
                              </Badge>
                              <Badge variant={getStatusColor(cylinder.currentStatus) as any} className="text-xs">
                                {cylinder.currentStatus.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewVehicle(vehicle)}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditVehicle(vehicle)}
                    >
                      Edit Vehicle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New {activeTab === 'stores' ? 'Store' : 'Vehicle'}
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                
                if (activeTab === 'stores') {
                  const data = {
                    name: form.name.value,
                    location: form.location.value,
                    address: form.address.value || null
                  };
                  handleAddStore(data);
                } else {
                  const data = {
                    vehicleNumber: form.vehicleNumber.value,
                    vehicleType: form.vehicleType.value,
                    driverName: form.driverName.value || null,
                    capacity: form.capacity.value ? parseInt(form.capacity.value) : null
                  };
                  handleAddVehicle(data);
                }
              }}>
                {activeTab === 'stores' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Store Name</label>
                      <Input name="name" type="text" placeholder="Main Store" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                      <Input name="location" type="text" placeholder="Karachi" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                      <Input name="address" type="text" placeholder="123 Main Street" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Number</label>
                      <Input name="vehicleNumber" type="text" placeholder="ABC-123" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type</label>
                      <Input name="vehicleType" type="text" placeholder="Delivery Truck" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Driver Name</label>
                      <Input name="driverName" type="text" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
                      <Input name="capacity" type="number" placeholder="50" />
                    </div>
                  </>
                )}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add {activeTab === 'stores' ? 'Store' : 'Vehicle'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
