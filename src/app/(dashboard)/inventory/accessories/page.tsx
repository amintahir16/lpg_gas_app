"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  // Notifications link to e.g. `/inventory/accessories?category=Stoves&item=…`.
  // We honour `category` to pre-select the tab once data has loaded.
  const requestedCategory = searchParams?.get('category') || null;
  const requestedItemId = searchParams?.get('item') || null;
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

        // Prefer the category requested in the URL (e.g. via a notification
        // link) when it actually exists in this region's categories. Fall
        // back to the first category if none is selected yet.
        if (uniqueCategories.length > 0 && !activeTab) {
          const matched = requestedCategory && uniqueCategories.find(
            c => c.toLowerCase() === requestedCategory.toLowerCase()
          );
          setActiveTab(matched || uniqueCategories[0]);
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

  // Normalize and format category name
  const normalizeAndFormatCategoryName = (categoryName: string): string => {
    if (!categoryName) return '';

    // First normalize: trim and lowercase
    const normalized = categoryName.trim().toLowerCase();

    if (!normalized) return '';

    // Handle common variations
    if (normalized === 'stove' || normalized === 'stoves') {
      return 'Stoves';
    } else if (normalized === 'regulator' || normalized === 'regulators') {
      return 'Regulators';
    } else if (normalized === 'valve' || normalized === 'valves') {
      return 'Valves';
    } else if (normalized === 'pipe' || normalized === 'pipes' || normalized === 'gas pipe' || normalized === 'gas pipes') {
      return 'Gas Pipes';
    } else if (normalized === 'vaporizer' || normalized === 'vaporizers' || normalized === 'vaporiser' || normalized === 'vaporisers') {
      return 'Vaporizers';
    } else {
      // Capitalize first letter of each word
      return normalized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  };

  const handleCreateCustomItem = async (itemName: string) => {
    // First normalize the category name, then format it
    const normalizedCategoryName = normalizeAndFormatCategoryName(itemName);

    if (!normalizedCategoryName) {
      alert('Please enter a valid category name');
      return;
    }

    try {
      const response = await fetch('/api/inventory/custom-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: normalizedCategoryName, // This creates a new category (normalized and formatted)
          type: normalizedCategoryName, // This is the first item in the category
          quantity: 0,
          costPerPiece: 0,
          totalCost: 0
        }),
        credentials: 'include'
      });

      if (response.ok) {
        await fetchData();
        setActiveTab(normalizedCategoryName); // Set the new category as active tab
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
            className="text-gray-500 hover:text-gray-900 -ml-2"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accessories & Equipment</h1>
            <p className="mt-1 text-gray-500 text-sm">
              Manage your inventory items
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => setShowAddItemForm(true)}
            size="sm"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-sm h-9"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {customItems.length > 0 ? 'Add New Category' : 'Add Item'}
          </Button>
        </div>
      </div>

      {/* Statistics - Dynamic Cards for Each Category */}
      {categories.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((category) => {
            const categoryItems = customItems.filter(item => item.name === category);
            const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalValue = categoryItems.reduce((sum, item) => sum + parseFloat(item.totalCost.toString()), 0);

            return (
              <Card key={category} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold text-gray-600 capitalize truncate pr-1">{category}</CardTitle>
                  <WrenchScrewdriverIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-lg font-bold text-gray-900 mb-1">{totalQuantity}</div>
                  <p className="text-[11px] text-gray-500 mb-2">Total pieces</p>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">PKR {totalValue.toLocaleString()}</div>
                    <p className="text-[11px] text-gray-500 pt-0.5">Value</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Overall Total Value Card */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-gray-600 truncate pr-1">Total Value</CardTitle>
              <CurrencyDollarIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg font-bold text-gray-900 mb-1">PKR {stats.totalValue.toLocaleString()}</div>
              <p className="text-[11px] text-gray-500 mb-2">Equipment value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${activeTab || 'items'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      {categories.length > 0 && (
        <Card className="border shadow-sm bg-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const categoryItems = customItems.filter(item => item.name === category);
                const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <Button
                    key={category}
                    variant={activeTab === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(category)}
                    className={`${activeTab === category
                      ? 'bg-blue-600 text-white hover:bg-blue-700 border-none'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                      } h-9 px-4 text-xs font-medium transition-colors`}
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
      <Card className="border shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {activeTab ? `${activeTab} Inventory` : 'Custom Items Inventory'}
          </CardTitle>
          <div className="flex space-x-2">
            {activeTab && session?.user?.role === 'SUPER_ADMIN' && (
              <>
                <Button
                  onClick={() => setShowRenameCategoryForm(true)}
                  variant="outline"
                  size="sm"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50 h-9 text-xs"
                >
                  Rename Category
                </Button>
                <Button
                  onClick={handleDeleteCategory}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-600 hover:bg-red-50 h-9 text-xs"
                >
                  Delete Category
                </Button>
              </>
            )}
            {activeTab && (
              <Button
                onClick={() => setShowAddForm(true)}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-sm h-9 text-xs"
              >
                <PlusIcon className="w-4 h-4 mr-1.5" />
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cost per Piece (PKR)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantity in Store
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center border-b">
                      <div className="animate-pulse">Loading items...</div>
                    </td>
                  </tr>
                ) : filteredCustomItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center text-gray-500 border-b">
                      No items found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{item.type}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">
                        PKR {item.costPerPiece.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                        PKR {item.totalCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleEditCustomItem(item)}
                          >
                            Edit
                          </Button>
                          {session?.user?.role === 'SUPER_ADMIN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteCustomItem(item.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {/* Totals Row */}
                {filteredCustomItems.length > 0 && (
                  <tr className="bg-gray-50/80 border-t border-gray-200">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">Total</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm font-bold text-gray-500">
                      -
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm font-bold text-gray-900">
                      {filteredCustomItems.reduce((sum, item) => sum + Number(item.quantity), 0)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm font-bold text-gray-900">
                      PKR {filteredCustomItems.reduce((sum, item) => sum + Number(item.totalCost), 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-500">-</div>
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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-md shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Rename Category</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update the name for this category</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowRenameCategoryForm(false)} className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Close</span>
                <span className="text-xl">×</span>
              </Button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                handleRenameCategory();
              }}>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Current Name</label>
                  <Input
                    type="text"
                    value={activeTab || 'No category selected'}
                    disabled
                    className="bg-gray-50 h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">New Name</label>
                  <Input
                    type="text"
                    placeholder="Enter new category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setShowRenameCategoryForm(false);
                      setNewCategoryName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 h-9">
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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-md shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {customItems.length > 0 ? 'Add New Category' : 'Add Item Category'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Create a new inventory category</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddItemForm(false)} className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Close</span>
                <span className="text-xl">×</span>
              </Button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (newItemName.trim()) {
                  handleCreateCustomItem(newItemName.trim());
                }
              }}>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Category Name</label>
                  <Input
                    type="text"
                    placeholder="e.g., Pipes, Regulators, etc."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setShowAddItemForm(false);
                      setNewItemName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 h-9">
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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-md shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Item</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update {activeTab} item details</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowEditForm(false); setSelectedItem(null); }} className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Close</span>
                <span className="text-xl">×</span>
              </Button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();

                const data = {
                  name: activeTab,
                  type: editFormValues.type,
                  costPerPiece: parseFloat(editFormValues.costPerPiece),
                  quantity: parseInt(editFormValues.quantity),
                  totalCost: parseFloat(editFormValues.totalCost)
                };

                handleUpdateCustomItem(selectedItem.id, data);
                setEditFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                    <Input
                      name="type"
                      type="text"
                      value={editFormValues.type}
                      onChange={(e) => handleEditFormInputChange('type', e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Cost / Piece (PKR)</label>
                    <Input
                      name="costPerPiece"
                      type="number"
                      value={editFormValues.costPerPiece}
                      onChange={(e) => handleEditFormInputChange('costPerPiece', e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quantity</label>
                    <Input
                      name="quantity"
                      type="number"
                      value={editFormValues.quantity}
                      onChange={(e) => handleEditFormInputChange('quantity', e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Total Cost (PKR)</label>
                    <Input
                      name="totalCost"
                      type="number"
                      value={editFormValues.totalCost}
                      readOnly
                      className="bg-gray-50 h-9 font-semibold text-gray-700"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedItem(null);
                      setEditFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 h-9">
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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-0 border w-full max-w-md shadow-2xl rounded-xl bg-white animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add {activeTab || 'New Item'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter item details below</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="h-8 w-8 p-0 rounded-full">
                <span className="sr-only">Close</span>
                <span className="text-xl">×</span>
              </Button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();

                const data = {
                  name: activeTab,
                  type: formValues.type,
                  quantity: parseInt(formValues.quantity),
                  costPerPiece: parseFloat(formValues.costPerPiece),
                  totalCost: parseFloat(formValues.totalCost)
                };

                handleAddItem(data);
                setFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                    <Input
                      name="type"
                      type="text"
                      placeholder="Item Type (e.g., 20mm)"
                      value={formValues.type}
                      onChange={(e) => handleFormInputChange('type', e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quantity</label>
                    <Input
                      name="quantity"
                      type="number"
                      placeholder="e.g. 10"
                      value={formValues.quantity}
                      onChange={(e) => handleFormInputChange('quantity', e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Cost / Piece (PKR)</label>
                    <Input
                      name="costPerPiece"
                      type="number"
                      placeholder="e.g. 500"
                      value={formValues.costPerPiece}
                      onChange={(e) => handleFormInputChange('costPerPiece', e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Total Cost (PKR)</label>
                    <Input
                      name="totalCost"
                      type="number"
                      placeholder="0"
                      value={formValues.totalCost}
                      readOnly
                      className="bg-gray-50 h-9 font-semibold text-gray-700"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormValues({ type: '', quantity: '', costPerPiece: '', totalCost: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 h-9">
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