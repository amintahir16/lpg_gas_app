"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

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
  totalCustomItems: number;
  totalValue: number;
}

export default function AccessoriesInventoryPage() {
  const [activeTab, setActiveTab] = useState<string>('');
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<EquipmentStats>({
    totalCustomItems: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CustomItem | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showRenameCategoryForm, setShowRenameCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Form calculation states
  const [formValues, setFormValues] = useState({
    type: '',
    quantity: '',
    costPerPiece: '',
    totalCost: ''
  });
  
  const [editFormValues, setEditFormValues] = useState({
    type: '',
    quantity: '',
    costPerPiece: '',
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
    
    if (field === 'quantity' || field === 'costPerPiece') {
      const quantity = field === 'quantity' ? value : newValues.quantity;
      const costPerPiece = field === 'costPerPiece' ? value : newValues.costPerPiece;
      newValues.totalCost = calculateTotalCost(quantity, costPerPiece);
    }
    
    setFormValues(newValues);
  };

  const handleEditFormInputChange = (field: string, value: string) => {
    const newValues = { ...editFormValues, [field]: value };
    
    if (field === 'quantity' || field === 'costPerPiece') {
      const quantity = field === 'quantity' ? value : newValues.quantity;
      const costPerPiece = field === 'costPerPiece' ? value : newValues.costPerPiece;
      newValues.totalCost = calculateTotalCost(quantity, costPerPiece);
    }
    
    setEditFormValues(newValues);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [customItems]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/custom-items', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const items: CustomItem[] = data.customItems || [];
        setCustomItems(items);
        
        // Extract unique categories
        const uniqueCategories: string[] = [...new Set(items.map((item: CustomItem) => item.name))];
        setCategories(uniqueCategories);
        
        // Set active tab to first category if none selected
        if (uniqueCategories.length > 0 && !activeTab) {
          setActiveTab(uniqueCategories[0]);
        }
      } else {
        console.error('Failed to fetch data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch custom items:', error);
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

  // Get items for the active tab
  const getActiveTabItems = () => {
    if (!activeTab) return [];
    return customItems.filter(item => item.name === activeTab);
  };

  const activeTabItems = getActiveTabItems();
  
  const filteredCustomItems = activeTabItems.filter(item =>
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

  const handleEditCustomItem = (customItem: CustomItem) => {
    setSelectedItem(customItem);
    setEditFormValues({
      type: customItem.type,
      quantity: customItem.quantity.toString(),
      costPerPiece: customItem.costPerPiece.toString(),
      totalCost: customItem.totalCost.toString()
    });
    setShowEditForm(true);
  };

  const handleUpdateCustomItem = async (id: string, formData: {
    name: string;
    type: string;
    quantity: number;
    costPerPiece: number;
    totalCost: number;
  }) => {
    try {
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

      await fetchData();
      setShowEditForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update custom item:', error);
    }
  };

  const handleDeleteCustomItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
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
          name: itemName, // This creates a new category
          type: itemName, // This is the first item in the category
          quantity: 0,
          costPerPiece: 0,
          totalCost: 0
        }),
        credentials: 'include'
      });

      if (response.ok) {
        await fetchData();
        setActiveTab(itemName); // Set the new category as active tab
        setShowAddItemForm(false);
        setNewItemName('');
        alert('Custom item category created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to create custom item:', error);
      alert('Error: Failed to create custom item');
    }
  };

  const handleRenameCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a new category name');
      return;
    }

    if (!activeTab) {
      alert('No category selected');
      return;
    }

    try {
      const response = await fetch(`/api/inventory/custom-items/category/${encodeURIComponent(activeTab)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName: newCategoryName.trim() }),
        credentials: 'include'
      });

      if (response.ok) {
        await fetchData();
        setActiveTab(newCategoryName.trim()); // Update active tab to new name
        setShowRenameCategoryForm(false);
        setNewCategoryName('');
        alert(`Category renamed to "${newCategoryName}" successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to rename category:', error);
      alert('Error: Failed to rename category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!activeTab) {
      alert('No category selected');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the entire "${activeTab}" category and all its items? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/inventory/custom-items/category/${encodeURIComponent(activeTab)}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchData();
        // Switch to first available category or clear active tab
        const remainingCategories = categories.filter(cat => cat !== activeTab);
        if (remainingCategories.length > 0) {
          setActiveTab(remainingCategories[0]);
        } else {
          setActiveTab('');
        }
        alert(`Category "${activeTab}" deleted successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Error: Failed to delete category');
    }
  };

  const handleAddItem = async (formData: {
    name: string;
    type: string;
    quantity: number;
    costPerPiece: number;
    totalCost: number;
  }) => {
    if (!activeTab) {
      alert('Please select a category first');
      return;
    }

    try {
      // Use the active tab as the category name
      const itemData = {
        ...formData,
        name: activeTab // Use the active tab as the category name
      };

      const response = await fetch('/api/inventory/custom-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create item');
      }

      await fetchData();
      setShowAddForm(false);
      alert('Item added successfully!');
    } catch (error) {
      console.error('Failed to add item:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to add item'}`);
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
              Manage your inventory items
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={() => setShowAddItemForm(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {customItems.length > 0 ? 'Add New Category' : 'Add Item'}
          </Button>
        </div>
      </div>

      {/* Statistics - Dynamic Cards for Each Category */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
          {categories.map((category) => {
            const categoryItems = customItems.filter(item => item.name === category);
            const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalValue = categoryItems.reduce((sum, item) => sum + parseFloat(item.totalCost.toString()), 0);
            
            return (
              <Card key={category} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-600 capitalize">{category}</CardTitle>
                  <WrenchScrewdriverIcon className="w-5 h-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalQuantity}</div>
                  <p className="text-xs text-gray-500 mt-1">Total pieces</p>
                  <div className="mt-2">
                    <div className="text-sm font-semibold text-gray-700">PKR {totalValue.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">Value</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Overall Total Value Card */}
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
      )}

      {/* Search */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${activeTab || 'items'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      {categories.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const categoryItems = customItems.filter(item => item.name === category);
                const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
                
                return (
                  <Button
                    key={category}
                    variant={activeTab === category ? "default" : "outline"}
                    onClick={() => setActiveTab(category)}
                    className={`${
                      activeTab === category
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    } px-4 py-2 rounded-lg font-medium transition-colors`}
                  >
                    {category} ({totalQuantity})
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Items Table */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {activeTab ? `${activeTab} Inventory` : 'Custom Items Inventory'}
          </CardTitle>
          <div className="flex space-x-2">
            {activeTab && (
              <>
                <Button 
                  onClick={() => setShowRenameCategoryForm(true)}
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  Rename Category
                </Button>
                <Button 
                  onClick={handleDeleteCategory}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  Delete Category
                </Button>
              </>
            )}
            {activeTab && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add {activeTab}
              </Button>
            )}
          </div>
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
                      <div className="animate-pulse">Loading items...</div>
                    </td>
                  </tr>
                ) : filteredCustomItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No items found.
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
                {/* Totals Row */}
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

      {/* Rename Category Modal */}
      {showRenameCategoryForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Rename Category
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                handleRenameCategory();
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Name</label>
                  <Input 
                    type="text" 
                    value={activeTab || 'No category selected'}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Name</label>
                  <Input 
                    type="text" 
                    placeholder="Enter new category name" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required 
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowRenameCategoryForm(false);
                      setNewCategoryName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Rename Category
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
                {customItems.length > 0 ? 'Add New Category' : 'Add Item Category'}
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (newItemName.trim()) {
                  handleCreateCustomItem(newItemName.trim());
                }
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name</label>
                  <Input 
                    type="text" 
                    placeholder="Enter category name (e.g., Pipes, Fittings, Regulators, etc.)" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will create a new inventory category
                  </p>
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
                    Create Category
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEditForm && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Edit Item
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                
                const data = {
                  name: activeTab, // Use the active tab as the category name
                  type: editFormValues.type,
                  costPerPiece: parseFloat(editFormValues.costPerPiece),
                  quantity: parseInt(editFormValues.quantity),
                  totalCost: parseFloat(editFormValues.totalCost)
                };
                
                handleUpdateCustomItem(selectedItem.id, data);
                setEditFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                  <Input 
                    name="type" 
                    type="text" 
                    value={editFormValues.type}
                    onChange={(e) => handleEditFormInputChange('type', e.target.value)}
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
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedItem(null);
                      setEditFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Item
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
                Add {activeTab || 'New Item'}
              </h3>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                
                const data = {
                  name: activeTab, // Use the active tab as the category name
                  type: formValues.type,
                  quantity: parseInt(formValues.quantity),
                  costPerPiece: parseFloat(formValues.costPerPiece),
                  totalCost: parseFloat(formValues.totalCost)
                };
                
                handleAddItem(data);
                setFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
              }}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                  <Input 
                    name="type" 
                    type="text" 
                    placeholder="Item Type" 
                    value={formValues.type}
                    onChange={(e) => handleFormInputChange('type', e.target.value)}
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
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add {activeTab || 'Item'}
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