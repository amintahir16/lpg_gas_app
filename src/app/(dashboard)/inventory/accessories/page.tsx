"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  WrenchScrewdriverIcon, 
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

interface Regulator {
  id: string;
  type: string;
  costPerPiece: number;
  quantity: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

interface GasPipe {
  id: string;
  type: string;
  quantity: number; // in meters
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

interface Stove {
  id: string;
  quality: string;
  quantity: number;
  costPerPiece?: number;
  totalCost?: number;
  createdAt: string;
  updatedAt: string;
}

interface EquipmentStats {
  totalRegulators: number;
  totalGasPipes: number; // in meters
  totalStoves: number;
  totalValue: number;
}

export default function AccessoriesInventoryPage() {
  const [activeTab, setActiveTab] = useState<'regulators' | 'pipes' | 'stoves'>('regulators');
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [gasPipes, setGasPipes] = useState<GasPipe[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [stats, setStats] = useState<EquipmentStats>({
    totalRegulators: 0,
    totalGasPipes: 0,
    totalStoves: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Regulator | GasPipe | Stove | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    fetchStats();
  }, [regulators, gasPipes, stoves]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/${activeTab}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        switch (activeTab) {
          case 'regulators':
            setRegulators(data.regulators || []);
            break;
          case 'pipes':
            setGasPipes(data.gasPipes || []);
            break;
          case 'stoves':
            setStoves(data.stoves || []);
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/inventory/accessories/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch equipment stats:', error);
    }
  };

  const filteredRegulators = regulators.filter(regulator =>
    regulator.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGasPipes = gasPipes.filter(pipe =>
    pipe.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStoves = stoves.filter(stove =>
    stove.quality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTabDisplayName = (tab: string) => {
    switch (tab) {
      case 'regulators':
        return 'Regulators';
      case 'pipes':
        return 'Gas Pipes';
      case 'stoves':
        return 'Stoves';
      default:
        return tab;
    }
  };

  const handleEditRegulator = (regulator: Regulator) => {
    setSelectedItem(regulator);
    setShowEditForm(true);
  };

  const handleEditGasPipe = (gasPipe: GasPipe) => {
    setSelectedItem(gasPipe);
    setShowEditForm(true);
  };

  const handleEditStove = (stove: Stove) => {
    setSelectedItem(stove);
    setShowEditForm(true);
  };

  const handleUpdateStove = async (id: string, formData: any) => {
    try {
      const response = await fetch(`/api/inventory/stoves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update stove');
      }

      await fetchData();
      setShowEditForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update stove:', error);
    }
  };

  const handleDeleteRegulator = async (id: string) => {
    if (confirm('Are you sure you want to delete this regulator?')) {
      try {
        const response = await fetch(`/api/inventory/regulators/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Failed to delete regulator:', error);
      }
    }
  };

  const handleDeleteGasPipe = async (id: string) => {
    if (confirm('Are you sure you want to delete this gas pipe?')) {
      try {
        const response = await fetch(`/api/inventory/pipes/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Failed to delete gas pipe:', error);
      }
    }
  };

  const handleDeleteStove = async (id: string) => {
    if (confirm('Are you sure you want to delete this stove?')) {
      try {
        const response = await fetch(`/api/inventory/stoves/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Failed to delete stove:', error);
      }
    }
  };

  const handleAddItem = async (formData: any) => {
    try {
      console.log('Submitting item data:', formData);
      
      const endpoint = activeTab === 'regulators' ? '/api/inventory/regulators' : 
                      activeTab === 'pipes' ? '/api/inventory/pipes' : '/api/inventory/stoves';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create ${getTabDisplayName(activeTab).toLowerCase()}`);
      }

      const result = await response.json();
      console.log('Item created successfully:', result);
      
      await fetchData();
      setShowAddForm(false);
      alert(`${getTabDisplayName(activeTab)} added successfully!`);
    } catch (error) {
      console.error(`Failed to add ${getTabDisplayName(activeTab).toLowerCase()}:`, error);
      alert(`Error: ${error instanceof Error ? error.message : `Failed to add ${getTabDisplayName(activeTab).toLowerCase()}`}`);
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
            <h1 className="text-3xl font-bold text-gray-900">Accessories & Equipment</h1>
            <p className="mt-2 text-gray-600 font-medium">
              Manage regulators, gas pipes, and stoves inventory
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add {getTabDisplayName(activeTab)}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Regulators</CardTitle>
            <WrenchScrewdriverIcon className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalRegulators}</div>
            <p className="text-xs text-gray-500 mt-1">Total pieces</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Gas Pipes</CardTitle>
            <CubeIcon className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalGasPipes.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Total meters</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Stoves</CardTitle>
            <WrenchScrewdriverIcon className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalStoves}</div>
            <p className="text-xs text-gray-500 mt-1">Total pieces</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Value</CardTitle>
            <CurrencyDollarIcon className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">PKR {stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Equipment value</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('regulators')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'regulators'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Regulators ({regulators.length})
          </button>
          <button
            onClick={() => setActiveTab('pipes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pipes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Gas Pipes ({gasPipes.length})
          </button>
          <button
            onClick={() => setActiveTab('stoves')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stoves'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stoves ({stoves.length})
          </button>
        </nav>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${getTabDisplayName(activeTab).toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Regulators Table */}
      {activeTab === 'regulators' && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Regulators Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cost per Piece (PKR)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quantity in Store
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <div className="animate-pulse">Loading regulators...</div>
                      </td>
                    </tr>
                  ) : filteredRegulators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No regulators found.
                      </td>
                    </tr>
                  ) : (
                    filteredRegulators.map((regulator) => (
                      <tr key={regulator.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{regulator.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          PKR {regulator.costPerPiece.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {regulator.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          PKR {regulator.totalCost.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditRegulator(regulator)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteRegulator(regulator.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Totals Row for Regulators */}
                  {filteredRegulators.length > 0 && (
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-900">Total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        {filteredRegulators.reduce((sum, regulator) => sum + Number(regulator.quantity), 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        PKR {filteredRegulators.reduce((sum, regulator) => sum + Number(regulator.totalCost), 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-900">-</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gas Pipes Table */}
      {activeTab === 'pipes' && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Gas Pipes Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quantity (Meters)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cost Per Meter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <div className="animate-pulse">Loading gas pipes...</div>
                      </td>
                    </tr>
                  ) : filteredGasPipes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No gas pipes found.
                      </td>
                    </tr>
                  ) : (
                    filteredGasPipes.map((pipe) => {
                      const costPerMeter = pipe.totalCost / pipe.quantity;
                      return (
                        <tr key={pipe.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{pipe.type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                            {pipe.quantity.toLocaleString()} meters
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                            PKR {costPerMeter.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                            PKR {pipe.totalCost.toLocaleString()}
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditGasPipe(pipe)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteGasPipe(pipe.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                  {/* Totals Row for Gas Pipes */}
                  {filteredGasPipes.length > 0 && (
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-900">Total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 text-center">
                        {filteredGasPipes.reduce((sum, pipe) => sum + Number(pipe.quantity), 0).toLocaleString()} meters
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 text-center">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 text-center">
                        PKR {filteredGasPipes.reduce((sum, pipe) => sum + Number(pipe.totalCost), 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-900">-</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stoves Table */}
      {activeTab === 'stoves' && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Stoves Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quality Level
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cost per Piece
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <div className="animate-pulse">Loading stoves...</div>
                      </td>
                    </tr>
                  ) : filteredStoves.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No stoves found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredStoves.map((stove) => (
                        <tr key={stove.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{stove.quality}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                            {stove.quantity} pieces
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                            PKR {(stove.costPerPiece || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                            PKR {(stove.totalCost || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditStove(stove)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteStove(stove.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Total Row */}
                      {filteredStoves.length > 0 && (
                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">TOTAL</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                            {filteredStoves.reduce((sum, stove) => sum + Number(stove.quantity), 0)} pieces
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                            -
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                            PKR {filteredStoves.reduce((sum, stove) => sum + Number(stove.totalCost || 0), 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowAddForm(true)}
                              >
                                Add Stove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form Modal */}
      {showEditForm && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Edit {getTabDisplayName(activeTab)}
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                
                let data: any = {};
                if (activeTab === 'regulators') {
                  data = {
                    type: form.type.value,
                    costPerPiece: parseFloat(form.costPerPiece.value),
                    quantity: parseInt(form.quantity.value)
                  };
                } else if (activeTab === 'pipes') {
                  data = {
                    type: form.type.value,
                    quantity: parseFloat(form.quantity.value),
                    totalCost: parseFloat(form.totalCost.value)
                  };
                } else if (activeTab === 'stoves') {
                  data = {
                    quality: form.quality.value,
                    quantity: parseInt(form.quantity.value),
                    costPerPiece: parseFloat(form.costPerPiece.value)
                  };
                }
                
                handleUpdateStove(selectedItem.id, data);
              }}>
                {activeTab === 'regulators' && selectedItem && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" defaultValue={(selectedItem as Regulator).type} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input name="costPerPiece" type="number" defaultValue={(selectedItem as Regulator).costPerPiece} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input name="quantity" type="number" defaultValue={(selectedItem as Regulator).quantity} required />
                    </div>
                  </>
                )}
                {activeTab === 'pipes' && selectedItem && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" defaultValue={(selectedItem as GasPipe).type} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity (Meters)</label>
                      <Input name="quantity" type="number" defaultValue={(selectedItem as GasPipe).quantity} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input name="totalCost" type="number" defaultValue={(selectedItem as GasPipe).totalCost} required />
                    </div>
                  </>
                )}
                {activeTab === 'stoves' && selectedItem && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quality Level</label>
                      <select name="quality" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue={(selectedItem as Stove).quality} required>
                        <option value="">Select Quality</option>
                        <option value="Quality 1">Quality 1</option>
                        <option value="Quality 2">Quality 2</option>
                        <option value="Quality 3">Quality 3</option>
                        <option value="Quality 4">Quality 4</option>
                        <option value="Quality 5">Quality 5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input name="costPerPiece" type="number" defaultValue={(selectedItem as Stove).costPerPiece || 0} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input name="quantity" type="number" defaultValue={(selectedItem as Stove).quantity} required />
                    </div>
                  </>
                )}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedItem(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update {getTabDisplayName(activeTab)}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New {getTabDisplayName(activeTab)}
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                
                let data: any = {};
                if (activeTab === 'regulators') {
                  data = {
                    type: form.type.value,
                    costPerPiece: parseFloat(form.costPerPiece.value),
                    quantity: parseInt(form.quantity.value)
                  };
                } else if (activeTab === 'pipes') {
                  data = {
                    type: form.type.value,
                    quantity: parseFloat(form.quantity.value),
                    totalCost: parseFloat(form.totalCost.value)
                  };
                } else if (activeTab === 'stoves') {
                  data = {
                    quality: form.quality.value,
                    quantity: parseInt(form.quantity.value),
                    costPerPiece: parseFloat(form.costPerPiece.value)
                  };
                }
                
                handleAddItem(data);
              }}>
                {activeTab === 'regulators' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" placeholder="Adjustable" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input name="costPerPiece" type="number" placeholder="1000" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input name="quantity" type="number" placeholder="10" required />
                    </div>
                  </>
                )}
                {activeTab === 'pipes' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" placeholder="High Pressure" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity (Meters)</label>
                      <Input name="quantity" type="number" placeholder="100" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input name="totalCost" type="number" placeholder="5000" required />
                    </div>
                  </>
                )}
                {activeTab === 'stoves' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quality Level</label>
                      <select name="quality" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        <option value="">Select Quality</option>
                        <option value="Quality 1">Quality 1</option>
                        <option value="Quality 2">Quality 2</option>
                        <option value="Quality 3">Quality 3</option>
                        <option value="Quality 4">Quality 4</option>
                        <option value="Quality 5">Quality 5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input name="costPerPiece" type="number" placeholder="1000" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input name="quantity" type="number" placeholder="5" required />
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
                    Add {getTabDisplayName(activeTab)}
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
