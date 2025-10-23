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

interface Valve {
  id: string;
  type: string;
  quantity: number;
  costPerPiece: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  costPerPiece: number;
  totalCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EquipmentStats {
  totalRegulators: number;
  totalGasPipes: number; // in meters
  totalStoves: number;
  totalValves: number;
  totalCustomItems: number;
  totalValue: number;
}

export default function AccessoriesInventoryPage() {
  const [activeTab, setActiveTab] = useState<'regulators' | 'pipes' | 'stoves' | 'valves' | 'custom'>('regulators');
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [gasPipes, setGasPipes] = useState<GasPipe[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [valves, setValves] = useState<Valve[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [stats, setStats] = useState<EquipmentStats>({
    totalRegulators: 0,
    totalGasPipes: 0,
    totalStoves: 0,
    totalValves: 0,
    totalCustomItems: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Regulator | GasPipe | Stove | Valve | CustomItem | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  
  // Form calculation states
  const [formValues, setFormValues] = useState({
    quantity: '',
    costPerPiece: '',
    costPerMeter: '',
    totalCost: ''
  });
  
  const [editFormValues, setEditFormValues] = useState({
    quantity: '',
    costPerPiece: '',
    costPerMeter: '',
    totalCost: ''
  });

  // Auto-calculate total cost
  const calculateTotalCost = (quantity: string, costPerPiece: string) => {
    const qty = parseFloat(quantity) || 0;
    const cost = parseFloat(costPerPiece) || 0;
    const total = qty * cost;
    return total > 0 ? total.toString() : '';
  };

  const handleFormInputChange = (field: string, value: string) => {
    const newValues = { ...formValues, [field]: value };
    
    // Auto-calculate total cost for regulators, stoves, valves, and custom items
    if ((activeTab === 'regulators' || activeTab === 'stoves' || activeTab === 'valves' || activeTab === 'custom') && 
        (field === 'quantity' || field === 'costPerPiece')) {
      const quantity = field === 'quantity' ? value : newValues.quantity;
      const costPerPiece = field === 'costPerPiece' ? value : newValues.costPerPiece;
      newValues.totalCost = calculateTotalCost(quantity, costPerPiece);
    }
    
    // Auto-calculate total cost for pipes (quantity * costPerMeter)
    if (activeTab === 'pipes' && (field === 'quantity' || field === 'costPerMeter')) {
      const quantity = field === 'quantity' ? value : newValues.quantity;
      const costPerMeter = field === 'costPerMeter' ? value : newValues.costPerMeter;
      newValues.totalCost = calculateTotalCost(quantity, costPerMeter);
    }
    
    setFormValues(newValues);
  };

  const handleEditFormInputChange = (field: string, value: string) => {
    const newValues = { ...editFormValues, [field]: value };
    
    // Auto-calculate total cost for regulators, stoves, valves, and custom items
    if ((activeTab === 'regulators' || activeTab === 'stoves' || activeTab === 'valves' || activeTab === 'custom') && 
        (field === 'quantity' || field === 'costPerPiece')) {
      const quantity = field === 'quantity' ? value : newValues.quantity;
      const costPerPiece = field === 'costPerPiece' ? value : newValues.costPerPiece;
      newValues.totalCost = calculateTotalCost(quantity, costPerPiece);
    }
    
    // Auto-calculate total cost for pipes (quantity * costPerMeter)
    if (activeTab === 'pipes' && (field === 'quantity' || field === 'costPerMeter')) {
      const quantity = field === 'quantity' ? value : newValues.quantity;
      const costPerMeter = field === 'costPerMeter' ? value : newValues.costPerMeter;
      newValues.totalCost = calculateTotalCost(quantity, costPerMeter);
      console.log('Gas pipe edit calculation:', { quantity, costPerMeter, totalCost: newValues.totalCost });
    }
    
    setEditFormValues(newValues);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Fetch custom items on initial load to show correct tab name
  useEffect(() => {
    const fetchCustomItems = async () => {
      try {
        const response = await fetch('/api/inventory/custom-items', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCustomItems(data.customItems || []);
        }
      } catch (error) {
        console.error('Failed to fetch custom items on load:', error);
      }
    };
    
    fetchCustomItems();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [regulators, gasPipes, stoves]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data for tab:', activeTab);
      const endpoint = activeTab === 'custom' ? '/api/inventory/custom-items' : `/api/inventory/${activeTab}`;
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched data:', data);
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
          case 'valves':
            setValves(data.valves || []);
            break;
          case 'custom':
            setCustomItems(data.customItems || []);
            break;
        }
      } else {
        console.error('Failed to fetch data:', response.status, response.statusText);
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

  const filteredValves = valves.filter(valve =>
    valve.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomItems = customItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to determine the dynamic name for custom items
  const getCustomItemCategoryName = () => {
    if (customItems.length === 0) {
      return 'Custom Items';
    }
    // Get the first item's name (this is the category name)
    return customItems[0].name;
  };

  const getTabDisplayName = (tab: string) => {
    switch (tab) {
      case 'regulators':
        return 'Regulators';
      case 'pipes':
        return 'Gas Pipes';
      case 'stoves':
        return 'Stoves';
      case 'valves':
        return 'Valves';
      case 'custom':
        return getCustomItemCategoryName();
      default:
        return tab;
    }
  };

  const handleEditRegulator = (regulator: Regulator) => {
    setSelectedItem(regulator);
    setEditFormValues({
      quantity: regulator.quantity.toString(),
      costPerPiece: regulator.costPerPiece.toString(),
      costPerMeter: '',
      totalCost: regulator.totalCost.toString()
    });
    setShowEditForm(true);
  };

  const handleEditGasPipe = (gasPipe: GasPipe) => {
    console.log('Editing gas pipe:', gasPipe);
    const costPerMeter = (gasPipe.totalCost / gasPipe.quantity).toString();
    console.log('Calculated cost per meter:', costPerMeter);
    
    setSelectedItem(gasPipe);
    setEditFormValues({
      quantity: gasPipe.quantity.toString(),
      costPerPiece: '',
      costPerMeter: costPerMeter,
      totalCost: gasPipe.totalCost.toString()
    });
    console.log('Set edit form values:', {
      quantity: gasPipe.quantity.toString(),
      costPerMeter: costPerMeter,
      totalCost: gasPipe.totalCost.toString()
    });
    setShowEditForm(true);
  };

  const handleEditStove = (stove: Stove) => {
    setSelectedItem(stove);
    setEditFormValues({
      quantity: stove.quantity.toString(),
      costPerPiece: (stove.costPerPiece || 0).toString(),
      costPerMeter: '',
      totalCost: (stove.totalCost || 0).toString()
    });
    setShowEditForm(true);
  };

  const handleUpdateRegulator = async (id: string, formData: any) => {
    try {
      console.log('Updating regulator:', id, formData);
      const response = await fetch(`/api/inventory/regulators/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update regulator: ${errorText}`);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      
      await fetchData();
      setShowEditForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update regulator:', error);
    }
  };

  const handleUpdateGasPipe = async (id: string, formData: any) => {
    try {
      console.log('Updating gas pipe:', id, formData);
      console.log('Form data types:', {
        type: typeof formData.type,
        quantity: typeof formData.quantity,
        totalCost: typeof formData.totalCost
      });
      
      const response = await fetch(`/api/inventory/pipes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update gas pipe: ${errorText}`);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      console.log('Updated gas pipe data:', result.gasPipe);
      
      await fetchData();
      setShowEditForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update gas pipe:', error);
    }
  };

  const handleUpdateStove = async (id: string, formData: any) => {
    try {
      console.log('Updating stove:', id, formData);
      const response = await fetch(`/api/inventory/stoves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update stove: ${errorText}`);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      
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

  const handleEditValve = (valve: Valve) => {
    setSelectedItem(valve);
    setEditFormValues({
      quantity: valve.quantity.toString(),
      costPerPiece: valve.costPerPiece.toString(),
      costPerMeter: '',
      totalCost: valve.totalCost.toString()
    });
    setShowEditForm(true);
  };

  const handleUpdateValve = async (id: string, formData: any) => {
    try {
      console.log('Updating valve:', id, formData);
      const response = await fetch(`/api/inventory/valves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update valve: ${errorText}`);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      
      await fetchData();
      setShowEditForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update valve:', error);
    }
  };

  const handleDeleteValve = async (id: string) => {
    if (confirm('Are you sure you want to delete this valve?')) {
      try {
        const response = await fetch(`/api/inventory/valves/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Failed to delete valve:', error);
      }
    }
  };

  const handleEditCustomItem = (customItem: CustomItem) => {
    setSelectedItem(customItem);
    setEditFormValues({
      quantity: customItem.quantity.toString(),
      costPerPiece: customItem.costPerPiece.toString(),
      costPerMeter: '',
      totalCost: customItem.totalCost.toString()
    });
    setShowEditForm(true);
  };

  const handleUpdateCustomItem = async (id: string, formData: any) => {
    try {
      console.log('Updating custom item:', id, formData);
      const response = await fetch(`/api/inventory/custom-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update custom item: ${errorText}`);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      
      await fetchData();
      setShowEditForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update custom item:', error);
    }
  };

  const handleDeleteCustomItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this custom item?')) {
      try {
        const response = await fetch(`/api/inventory/custom-items/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Failed to delete custom item:', error);
      }
    }
  };

  const handleCreateCustomItem = async (itemName: string) => {
    try {
      const response = await fetch('/api/inventory/custom-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: itemName,
          type: itemName,
          quantity: 0,
          costPerPiece: 0,
          totalCost: 0
        }),
        credentials: 'include'
      });

      if (response.ok) {
        await fetchData();
        setShowAddItemForm(false);
        setNewItemName('');
        alert('Custom item created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to create custom item:', error);
      alert('Error: Failed to create custom item');
    }
  };

  const handleAddItem = async (formData: any) => {
    try {
      console.log('Submitting item data:', formData);
      
      const endpoint = activeTab === 'regulators' ? '/api/inventory/regulators' : 
                      activeTab === 'pipes' ? '/api/inventory/pipes' : 
                      activeTab === 'stoves' ? '/api/inventory/stoves' : 
                      activeTab === 'valves' ? '/api/inventory/valves' : '/api/inventory/custom-items';
      
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
            onClick={() => setShowAddItemForm(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
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
            <CardTitle className="text-sm font-semibold text-gray-600">Valves</CardTitle>
            <WrenchScrewdriverIcon className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalValves}</div>
            <p className="text-xs text-gray-500 mt-1">Total pieces</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">{getCustomItemCategoryName()}</CardTitle>
            <WrenchScrewdriverIcon className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalCustomItems}</div>
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
          <button
            onClick={() => setActiveTab('valves')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'valves'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Valves ({valves.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {getCustomItemCategoryName()} ({customItems.length})
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Regulators Inventory
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Regulator
            </Button>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Gas Pipes Inventory
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Gas Pipe
            </Button>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Stoves Inventory
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Stove
            </Button>
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
                            {/* Empty cell for total row */}
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

      {/* Valves Table */}
      {activeTab === 'valves' && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Valves Inventory
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Valve
            </Button>
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
                        <div className="animate-pulse">Loading valves...</div>
                      </td>
                    </tr>
                  ) : filteredValves.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No valves found.
                      </td>
                    </tr>
                  ) : (
                    filteredValves.map((valve) => (
                      <tr key={valve.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{valve.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          PKR {valve.costPerPiece.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {valve.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          PKR {valve.totalCost.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditValve(valve)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteValve(valve.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Totals Row for Valves */}
                  {filteredValves.length > 0 && (
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-900">Total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        {filteredValves.reduce((sum, valve) => sum + Number(valve.quantity), 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        PKR {filteredValves.reduce((sum, valve) => sum + Number(valve.totalCost), 0).toLocaleString()}
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

      {/* Custom Items Table */}
      {activeTab === 'custom' && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {filteredCustomItems.length > 0 ? `${filteredCustomItems[0].name} Inventory` : 'Custom Items Inventory'}
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add {filteredCustomItems.length > 0 ? filteredCustomItems[0].name : 'Custom Item'}
            </Button>
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
                        <div className="animate-pulse">Loading custom items...</div>
                      </td>
                    </tr>
                  ) : filteredCustomItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No custom items found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{item.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          PKR {item.costPerPiece.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          PKR {item.totalCost.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditCustomItem(item)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteCustomItem(item.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Totals Row for Custom Items */}
                  {filteredCustomItems.length > 0 && (
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-900">Total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        {filteredCustomItems.reduce((sum, item) => sum + Number(item.quantity), 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                        PKR {filteredCustomItems.reduce((sum, item) => sum + Number(item.totalCost), 0).toLocaleString()}
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
                    costPerPiece: parseFloat(editFormValues.costPerPiece),
                    quantity: parseInt(editFormValues.quantity),
                    totalCost: parseFloat(editFormValues.totalCost)
                  };
                  handleUpdateRegulator(selectedItem.id, data);
                } else if (activeTab === 'pipes') {
                  data = {
                    type: form.type.value,
                    quantity: parseFloat(editFormValues.quantity),
                    totalCost: parseFloat(editFormValues.totalCost)
                  };
                  handleUpdateGasPipe(selectedItem.id, data);
                } else if (activeTab === 'stoves') {
                  data = {
                    quality: form.quality.value,
                    quantity: parseInt(editFormValues.quantity),
                    costPerPiece: parseFloat(editFormValues.costPerPiece),
                    totalCost: parseFloat(editFormValues.totalCost)
                  };
                  handleUpdateStove(selectedItem.id, data);
                } else if (activeTab === 'valves') {
                  data = {
                    type: form.type.value,
                    costPerPiece: parseFloat(editFormValues.costPerPiece),
                    quantity: parseInt(editFormValues.quantity),
                    totalCost: parseFloat(editFormValues.totalCost)
                  };
                  handleUpdateValve(selectedItem.id, data);
                } else if (activeTab === 'custom') {
                  const formData = new FormData(form);
                  data = {
                    name: formData.get('name') as string,
                    type: formData.get('type') as string,
                    costPerPiece: parseFloat(editFormValues.costPerPiece),
                    quantity: parseInt(editFormValues.quantity),
                    totalCost: parseFloat(editFormValues.totalCost)
                  };
                  handleUpdateCustomItem(selectedItem.id, data);
                }
                // Reset edit form values after submission
                setEditFormValues({ quantity: '', costPerPiece: '', costPerMeter: '', totalCost: '' });
              }}>
                {activeTab === 'regulators' && selectedItem && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" defaultValue={(selectedItem as Regulator).type} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        value={editFormValues.costPerPiece}
                        onChange={(e) => handleEditFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity in Store</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        value={editFormValues.quantity}
                        onChange={(e) => handleEditFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        value={editFormValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
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
                      <Input 
                        name="quantity" 
                        type="number" 
                        value={editFormValues.quantity}
                        onChange={(e) => handleEditFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost Per Meter (PKR)</label>
                      <Input 
                        name="costPerMeter" 
                        type="number" 
                        value={editFormValues.costPerMeter}
                        onChange={(e) => handleEditFormInputChange('costPerMeter', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        value={editFormValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        value={editFormValues.quantity}
                        onChange={(e) => handleEditFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        value={editFormValues.costPerPiece}
                        onChange={(e) => handleEditFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        value={editFormValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
                    </div>
                  </>
                )}
                {activeTab === 'valves' && selectedItem && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" defaultValue={(selectedItem as Valve).type} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        value={editFormValues.costPerPiece}
                        onChange={(e) => handleEditFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        value={editFormValues.quantity}
                        onChange={(e) => handleEditFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        value={editFormValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
                    </div>
                  </>
                )}
                {activeTab === 'custom' && selectedItem && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                      <Input name="name" type="text" defaultValue={(selectedItem as CustomItem).name} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" defaultValue={(selectedItem as CustomItem).type} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        value={editFormValues.costPerPiece}
                        onChange={(e) => handleEditFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        value={editFormValues.quantity}
                        onChange={(e) => handleEditFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        value={editFormValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
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
                      setEditFormValues({ quantity: '', costPerPiece: '', costPerMeter: '', totalCost: '' });
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

      {/* Add Item Modal */}
      {showAddItemForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New Item
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (newItemName.trim()) {
                  handleCreateCustomItem(newItemName.trim());
                }
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                  <Input 
                    type="text" 
                    placeholder="Enter item name (e.g., Pipes, Fittings, etc.)" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required 
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddItemForm(false);
                      setNewItemName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Item
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
                    costPerPiece: parseFloat(formValues.costPerPiece),
                    quantity: parseInt(formValues.quantity),
                    totalCost: parseFloat(formValues.totalCost)
                  };
                } else if (activeTab === 'pipes') {
                  data = {
                    type: form.type.value,
                    quantity: parseFloat(formValues.quantity),
                    totalCost: parseFloat(formValues.totalCost)
                  };
                } else if (activeTab === 'stoves') {
                  data = {
                    quality: form.quality.value,
                    quantity: parseInt(formValues.quantity),
                    costPerPiece: parseFloat(formValues.costPerPiece),
                    totalCost: parseFloat(formValues.totalCost)
                  };
                } else if (activeTab === 'valves') {
                  data = {
                    type: form.type.value,
                    quantity: parseInt(formValues.quantity),
                    costPerPiece: parseFloat(formValues.costPerPiece),
                    totalCost: parseFloat(formValues.totalCost)
                  };
                } else if (activeTab === 'custom') {
                  const formData = new FormData(form);
                  data = {
                    name: customItems.length > 0 ? customItems[0].name : 'Custom Item',
                    type: formData.get('type') as string,
                    quantity: parseInt(formValues.quantity),
                    costPerPiece: parseFloat(formValues.costPerPiece),
                    totalCost: parseFloat(formValues.totalCost)
                  };
                }
                
                handleAddItem(data);
                // Reset form values after submission
                setFormValues({ quantity: '', costPerPiece: '', costPerMeter: '', totalCost: '' });
              }}>
                {activeTab === 'regulators' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" placeholder="Adjustable" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        placeholder="1000" 
                        value={formValues.costPerPiece}
                        onChange={(e) => handleFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        placeholder="10" 
                        value={formValues.quantity}
                        onChange={(e) => handleFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        placeholder="10000" 
                        value={formValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
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
                      <Input 
                        name="quantity" 
                        type="number" 
                        placeholder="100" 
                        value={formValues.quantity}
                        onChange={(e) => handleFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost Per Meter (PKR)</label>
                      <Input 
                        name="costPerMeter" 
                        type="number" 
                        placeholder="50" 
                        value={formValues.costPerMeter}
                        onChange={(e) => handleFormInputChange('costPerMeter', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        placeholder="5000" 
                        value={formValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        placeholder="5" 
                        value={formValues.quantity}
                        onChange={(e) => handleFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        placeholder="1000" 
                        value={formValues.costPerPiece}
                        onChange={(e) => handleFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        placeholder="5000" 
                        value={formValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
                    </div>
                  </>
                )}
                {activeTab === 'valves' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" placeholder="Ball Valve" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        placeholder="10" 
                        value={formValues.quantity}
                        onChange={(e) => handleFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        placeholder="500" 
                        value={formValues.costPerPiece}
                        onChange={(e) => handleFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        placeholder="5000" 
                        value={formValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
                    </div>
                  </>
                )}
                {activeTab === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <Input name="type" type="text" placeholder="Item Type" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        placeholder="10" 
                        value={formValues.quantity}
                        onChange={(e) => handleFormInputChange('quantity', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Piece (PKR)</label>
                      <Input 
                        name="costPerPiece" 
                        type="number" 
                        placeholder="500" 
                        value={formValues.costPerPiece}
                        onChange={(e) => handleFormInputChange('costPerPiece', e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (PKR)</label>
                      <Input 
                        name="totalCost" 
                        type="number" 
                        placeholder="5000" 
                        value={formValues.totalCost}
                        readOnly
                        className="bg-gray-50"
                        required 
                      />
                    </div>
                  </>
                )}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormValues({ quantity: '', costPerPiece: '', costPerMeter: '', totalCost: '' });
                    }}
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
