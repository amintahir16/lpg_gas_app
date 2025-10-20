'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useDynamicInventory } from '@/hooks/useDynamicInventory';
import { DynamicAccessoryItem } from '@/app/api/inventory/accessories/dynamic/route';

interface AccessoryItem {
  name: string;
  quantity: number;
  pricePerItem: number;
  quality?: string;
}

interface CategoryAccessorySelectorProps {
  accessoryItems: AccessoryItem[];
  setAccessoryItems: (items: AccessoryItem[]) => void;
  onValidationChange?: (hasErrors: boolean) => void;
  onInventoryValidationChange?: (hasErrors: boolean, firstInvalidItem?: {category: string, index: number}) => void;
}

export function CategoryAccessorySelector({ accessoryItems, setAccessoryItems, onValidationChange, onInventoryValidationChange }: CategoryAccessorySelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<'regulators' | 'gasPipes' | 'stoves'>('regulators');
  
  // Fetch dynamic inventory data
  const { data: inventoryData, loading, error, getItemsByCategory } = useDynamicInventory();

  // Get items from dynamic inventory based on selected category
  const getFilteredItems = (): DynamicAccessoryItem[] => {
    if (!inventoryData) return [];
    return getItemsByCategory(selectedCategory);
  };

  const updateItem = (index: number, field: keyof AccessoryItem, value: any) => {
    const filteredItems = getFilteredItems();
    const dynamicItem = filteredItems[index];
    
    if (!dynamicItem) return;
    
    // Find existing item in accessoryItems or create new one
    let globalIndex = accessoryItems.findIndex(item => item.name === dynamicItem.name);
    
    if (globalIndex !== -1) {
      // Update existing item
      const newItems = [...accessoryItems];
      newItems[globalIndex] = { ...newItems[globalIndex], [field]: value };
      setAccessoryItems(newItems);
    } else {
      // Add new item with auto-calculated price (20% markup from inventory cost)
      const inventoryCost = dynamicItem.inventoryCost || dynamicItem.costPerPiece || 0;
      const autoCalculatedPrice = inventoryCost * 1.2; // 20% markup
      
      const newItem: AccessoryItem = {
        name: dynamicItem.name,
        quantity: field === 'quantity' ? value : 0,
        pricePerItem: autoCalculatedPrice, // Always use auto-calculated price
      };
      setAccessoryItems([...accessoryItems, newItem]);
    }

    // Check for validation errors after update
    checkValidationErrors();
  };

  const checkValidationErrors = () => {
    if (!inventoryData) return;

    let firstInvalidItem: {category: string, index: number} | null = null;
    let hasErrors = false;

    // Check regulators
    for (let i = 0; i < inventoryData.regulators.length; i++) {
      const dynamicItem = inventoryData.regulators[i];
      const currentItem = accessoryItems.find(item => item.name === dynamicItem.name);
      if (currentItem && currentItem.quantity > dynamicItem.quantity) {
        if (!firstInvalidItem) {
          firstInvalidItem = { category: 'regulators', index: i };
        }
        hasErrors = true;
      }
    }

    // Check gas pipes
    for (let i = 0; i < inventoryData.gasPipes.length; i++) {
      const dynamicItem = inventoryData.gasPipes[i];
      const currentItem = accessoryItems.find(item => item.name === dynamicItem.name);
      if (currentItem && currentItem.quantity > dynamicItem.quantity) {
        if (!firstInvalidItem) {
          firstInvalidItem = { category: 'gasPipes', index: i };
        }
        hasErrors = true;
      }
    }

    // Check stoves
    for (let i = 0; i < inventoryData.stoves.length; i++) {
      const dynamicItem = inventoryData.stoves[i];
      const currentItem = accessoryItems.find(item => item.name === dynamicItem.name);
      if (currentItem && currentItem.quantity > dynamicItem.quantity) {
        if (!firstInvalidItem) {
          firstInvalidItem = { category: 'stoves', index: i };
        }
        hasErrors = true;
      }
    }

    // Call both callbacks
    if (onValidationChange) {
      onValidationChange(hasErrors);
    }
    
    if (onInventoryValidationChange) {
      onInventoryValidationChange(hasErrors, firstInvalidItem || undefined);
    }
  };

  // Check validation errors when inventory data or accessory items change
  useEffect(() => {
    checkValidationErrors();
  }, [inventoryData, accessoryItems]);

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toFixed(2)}`;
  };

  const filteredItems = getFilteredItems();

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Button type="button" variant="outline" disabled>Regulators</Button>
          <Button type="button" variant="outline" disabled>Gas Pipes</Button>
          <Button type="button" variant="outline" disabled>Stoves</Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Button type="button" variant="outline" disabled>Regulators</Button>
          <Button type="button" variant="outline" disabled>Gas Pipes</Button>
          <Button type="button" variant="outline" disabled>Stoves</Button>
        </div>
        <div className="text-center py-8 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">Error loading inventory data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Buttons */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant={selectedCategory === 'regulators' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('regulators')}
        >
          Regulators ({inventoryData?.regulators.length || 0})
        </Button>
        <Button
          type="button"
          variant={selectedCategory === 'gasPipes' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('gasPipes')}
        >
          Gas Pipes ({inventoryData?.gasPipes.length || 0})
        </Button>
        <Button
          type="button"
          variant={selectedCategory === 'stoves' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('stoves')}
        >
          Stoves ({inventoryData?.stoves.length || 0})
        </Button>
      </div>

      {/* Category Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Item Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Quantity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Price Per Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Price</th>
                </tr>
              </thead>
          <tbody>
                {filteredItems.map((dynamicItem, index) => {
                  // Find current values from accessoryItems
                  const currentItem = accessoryItems.find(item => item.name === dynamicItem.name);
                  const currentQuantity = currentItem?.quantity || 0;
                  
                  // Calculate price with 20% markup from inventory cost
                  const inventoryCost = dynamicItem.inventoryCost || dynamicItem.costPerPiece || 0;
                  const autoCalculatedPrice = inventoryCost * 1.2;
                  const currentPrice = currentItem?.pricePerItem || autoCalculatedPrice;

              return (
                <tr 
                  key={dynamicItem.id} 
                  id={`inventory-item-${selectedCategory}-${index}`}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    <div>
                      {dynamicItem.name}
                      <div className="text-xs text-gray-500 mt-1">
                        Stock: {dynamicItem.quantity} units
                      </div>
                      <div className="text-xs text-green-600 mt-1 font-medium">
                        Inventory Price: Rs {dynamicItem.inventoryCost?.toFixed(2) || dynamicItem.costPerPiece?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="number"
                      min="0"
                      max={dynamicItem.quantity}
                      value={currentQuantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className={`w-20 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${
                        currentQuantity > dynamicItem.quantity
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white'
                      }`}
                    />
                    {currentQuantity > dynamicItem.quantity && (
                      <div className="text-xs text-red-600 mt-1">
                        Exceeds available stock ({dynamicItem.quantity})
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentPrice}
                      readOnly
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-700 cursor-not-allowed shadow-sm"
                    />
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {formatCurrency(currentQuantity * currentPrice)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
