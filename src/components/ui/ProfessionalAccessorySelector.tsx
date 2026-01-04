'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

interface AccessoryItem {
  id: string;
  category: string;
  itemType: string;
  quantity: number;
  costPerPiece: number;
  pricePerItem: number;
  totalPrice: number;
  availableStock: number;
  isVaporizer: boolean;
  // Vaporizer-specific pricing
  usagePrice: number; // Cost Price - for charging usage (not deducted from inventory)
  sellingPrice: number; // Selling Price - for selling vaporizer (deducted from inventory)
  markup: number;
}

interface ProfessionalAccessorySelectorProps {
  accessoryItems: AccessoryItem[];
  setAccessoryItems: (items: AccessoryItem[]) => void;
  onValidationChange?: (hasErrors: boolean) => void;
  onInventoryValidationChange?: (hasErrors: boolean, firstInvalidItem?: { category: string, index: number }) => void;
}

interface InventoryCategory {
  name: string;
  items: Array<{
    type: string;
    quantity: number;
    costPerPiece: number;
  }>;
}

export function ProfessionalAccessorySelector({
  accessoryItems,
  setAccessoryItems,
  onValidationChange,
  onInventoryValidationChange
}: ProfessionalAccessorySelectorProps) {
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalMarkup, setGlobalMarkup] = useState(20);

  // Vaporizer detection utility
  const isVaporizer = (category: string) => {
    return category.toLowerCase().includes('vaporizer');
  };

  // Fetch inventory categories and items
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/inventory/categories');
        if (!response.ok) {
          throw new Error(`Failed to fetch inventory categories: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setInventoryCategories(data.categories || []);
      } catch (err) {
        console.error('Error fetching inventory data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  // Handle global markup change
  const handleGlobalMarkupChange = (newMarkup: number) => {
    setGlobalMarkup(newMarkup);

    // Update all items with new markup
    const updatedItems = accessoryItems.map(item => {
      // Calculate new price based on markup
      const calculatedSellingPrice = item.costPerPiece * (1 + newMarkup / 100);

      if (!item.isVaporizer) {
        // Regular accessories
        const pricePerItem = calculatedSellingPrice;
        const totalPrice = item.quantity * pricePerItem;

        return {
          ...item,
          markup: newMarkup,
          pricePerItem,
          totalPrice
        };
      } else {
        // Vaporizers: Update Selling Price as well
        // Selling Price = Cost + Markup
        const sellingPrice = calculatedSellingPrice;
        const usagePrice = item.usagePrice || 0;

        // Final price per item = Selling + Usage
        const pricePerItem = sellingPrice + usagePrice;
        const totalPrice = item.quantity * pricePerItem;

        return {
          ...item,
          markup: newMarkup,
          sellingPrice,
          pricePerItem,
          totalPrice
        };
      }
    });

    setAccessoryItems(updatedItems);
  };

  // Add new accessory item
  const addAccessoryItem = () => {
    const newItem: AccessoryItem = {
      id: `item-${Date.now()}`,
      category: '',
      itemType: '',
      quantity: 0,
      costPerPiece: 0,
      pricePerItem: 0,
      totalPrice: 0,
      availableStock: 0,
      isVaporizer: false,
      usagePrice: 0,
      sellingPrice: 0,
      markup: globalMarkup
    };

    setAccessoryItems([...accessoryItems, newItem]);
  };

  // Remove accessory item
  const removeAccessoryItem = (id: string) => {
    setAccessoryItems(accessoryItems.filter(item => item.id !== id));
  };

  // Update accessory item
  const updateAccessoryItem = (id: string, field: keyof AccessoryItem, value: any) => {
    const updatedItems = accessoryItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // Auto-calculate price when quantity or pricing changes
        if (field === 'quantity' || field === 'costPerPiece' || field === 'usagePrice' || field === 'sellingPrice') {
          const quantity = field === 'quantity' ? value : updatedItem.quantity;
          const costPerPiece = field === 'costPerPiece' ? value : updatedItem.costPerPiece;
          const usagePrice = field === 'usagePrice' ? value : (updatedItem.usagePrice || 0);
          const sellingPrice = field === 'sellingPrice' ? value : (updatedItem.sellingPrice || 0);

          let finalPricePerItem = 0;
          let totalPrice = 0;

          // For vaporizers, handle usage vs selling pricing
          if (updatedItem.isVaporizer) {
            // Calculate total based on usage price + selling price
            const usageTotal = quantity * usagePrice;
            const sellingTotal = quantity * sellingPrice;
            totalPrice = usageTotal + sellingTotal;

            // Set pricePerItem to the total per item for display
            finalPricePerItem = usagePrice + sellingPrice;
          } else {
            // For regular accessories, use dynamic markup
            const markup = updatedItem.markup ?? globalMarkup;
            finalPricePerItem = costPerPiece * (1 + markup / 100);
            totalPrice = quantity * finalPricePerItem;
          }

          updatedItem.pricePerItem = finalPricePerItem;
          updatedItem.totalPrice = totalPrice;
        }

        return updatedItem;
      }
      return item;
    });

    setAccessoryItems(updatedItems);
    checkValidationErrors(updatedItems);
  };

  // Handle category selection
  const handleCategoryChange = (id: string, category: string) => {
    const categoryData = inventoryCategories.find(cat => cat.name === category);

    if (categoryData) {
      // Update all fields in a single state update to avoid race conditions
      const updatedItems = accessoryItems.map(item => {
        if (item.id === id) {
          const isVaporizerCategory = isVaporizer(category);
          return {
            ...item,
            category: category,
            itemType: '', // Reset item type
            costPerPiece: 0,
            pricePerItem: 0,
            totalPrice: 0,
            availableStock: 0,
            quantity: 0, // Reset quantity too
            isVaporizer: isVaporizerCategory,
            usagePrice: 0,
            sellingPrice: 0
          };
        }
        return item;
      });

      setAccessoryItems(updatedItems);
      checkValidationErrors(updatedItems);
    }
  };

  // Handle item type selection
  const handleItemTypeChange = (id: string, itemType: string) => {
    const item = accessoryItems.find(item => item.id === id);

    if (item && item.category) {
      const categoryData = inventoryCategories.find(cat => cat.name === item.category);

      if (categoryData) {
        const selectedItem = categoryData.items.find(i => i.type === itemType);

        if (selectedItem) {
          // Update all fields in a single state update
          const updatedItems = accessoryItems.map(accessoryItem => {
            if (accessoryItem.id === id) {
              const markup = accessoryItem.markup ?? globalMarkup;
              // Calculate price with markup for both regular and vaporizer items
              // Use the item's specific markup or fallback to global
              const calculatedSellingPrice = selectedItem.costPerPiece * (1 + markup / 100);

              let pricePerItem = 0;
              let totalPrice = 0;
              let usagePrice = 0;
              let sellingPrice = 0;

              if (accessoryItem.isVaporizer) {
                // For vaporizers:
                // Selling Price = Calculated Price (Cost + Markup)
                sellingPrice = calculatedSellingPrice;
                // Preserve existing usage price if any, or default to 0
                usagePrice = accessoryItem.usagePrice || 0;

                // Recalculate totals for vaporizer
                // pricePerItem for vaporizer is (usage + selling)
                pricePerItem = usagePrice + sellingPrice;
                const quantity = accessoryItem.quantity || 0;
                totalPrice = quantity * pricePerItem;
              } else {
                // For regular accessories
                pricePerItem = calculatedSellingPrice;
                const quantity = accessoryItem.quantity || 0;
                totalPrice = quantity * pricePerItem;
              }

              return {
                ...accessoryItem,
                itemType: itemType,
                costPerPiece: selectedItem.costPerPiece,
                availableStock: selectedItem.quantity,
                pricePerItem: pricePerItem,
                totalPrice: totalPrice,
                usagePrice: usagePrice,
                sellingPrice: sellingPrice,
                markup: markup
              };
            }
            return accessoryItem;
          });

          setAccessoryItems(updatedItems);
          checkValidationErrors(updatedItems);
        }
      }
    }
  };

  // Check validation errors
  const checkValidationErrors = (items: AccessoryItem[] = accessoryItems) => {
    let hasErrors = false;
    let firstInvalidItem: { category: string, index: number } | null = null;

    items.forEach((item, index) => {
      if (item.quantity > item.availableStock) {
        hasErrors = true;
        if (!firstInvalidItem) {
          firstInvalidItem = { category: item.category, index };
        }
      }
    });

    if (onValidationChange) {
      onValidationChange(hasErrors);
    }

    if (onInventoryValidationChange) {
      onInventoryValidationChange(hasErrors, firstInvalidItem || undefined);
    }
  };

  // Check validation errors when items change
  useEffect(() => {
    checkValidationErrors();
  }, [accessoryItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalAmount = () => {
    return accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
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
      <div className="text-center py-8 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">Error loading inventory data</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        {error.includes('401') && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              <strong>Authentication Required:</strong> Please make sure you're logged in to access inventory data.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Select categories and items from inventory</p>
        <div className="flex items-center space-x-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
          <span className="text-sm font-medium text-purple-700">Markup:</span>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={globalMarkup}
              onChange={(e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) val = 0;
                if (val > 100) val = 100;
                if (val < 0) val = 0;
                handleGlobalMarkupChange(val);
              }}
              className="w-12 px-1 py-0.5 text-sm text-center border-b border-purple-300 bg-transparent focus:outline-none focus:border-purple-500 font-semibold text-purple-900"
            />
            <span className="absolute right-0 top-0.5 text-transparent select-none pointer-events-none">%</span>
          </div>
          <span className="text-sm text-purple-700">%</span>
        </div>
      </div>

      {/* Accessories Table */}
      {accessoryItems.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No accessories selected</p>
          <p className="text-gray-500 text-sm mt-1">Click "Add Item" to start adding accessories</p>
          {inventoryCategories.length === 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> Inventory categories will load automatically when you're logged in.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto relative" style={{ zIndex: 9997 }}>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Item Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Quantity</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Cost Price</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Selling Price</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Price</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessoryItems.map((item, index) => {
                const categoryData = inventoryCategories.find(cat => cat.name === item.category);
                const availableItemTypes = categoryData?.items || [];

                return (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    {/* Category Dropdown */}
                    <td className="py-3 px-4 min-h-[80px] align-top">
                      <div className="flex flex-col">
                        <select
                          value={item.category}
                          onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Category</option>
                          {inventoryCategories.map(category => (
                            <option key={category.name} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {item.category && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            ✓ {item.category}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Item Type Dropdown */}
                    <td className="py-3 px-4 min-h-[80px] align-top">
                      <div className="flex flex-col">
                        <select
                          value={item.itemType}
                          onChange={(e) => handleItemTypeChange(item.id, e.target.value)}
                          disabled={!item.category}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <option value="">Select Item Type</option>
                          {availableItemTypes.map(itemType => (
                            <option key={itemType.type} value={itemType.type}>
                              {itemType.type}
                            </option>
                          ))}
                        </select>
                        {item.itemType && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            ✓ {item.itemType}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Quantity Input */}
                    <td className="py-3 px-4 min-h-[80px] align-top">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max={item.availableStock}
                            value={item.quantity}
                            onChange={(e) => updateAccessoryItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className={`w-20 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${item.quantity > item.availableStock
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 bg-white'
                              }`}
                            disabled={!item.itemType}
                          />
                        </div>
                        {item.availableStock > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Available: {item.availableStock}
                          </div>
                        )}
                        {item.quantity > item.availableStock && (
                          <div className="text-xs text-red-600 mt-1">
                            Exceeds available stock
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cost Price */}
                    <td className="py-3 px-4 min-h-[80px] align-top">
                      <div className="flex flex-col">
                        <div className={`flex items-center ${!item.isVaporizer ? 'pt-3' : 'pt-1'}`}>
                          <CurrencyDollarIcon className="w-4 h-4 mr-1 text-gray-500" />
                          {item.isVaporizer ? (
                            <div className="flex flex-col">
                              <input
                                type="number"
                                value={item.usagePrice || 0}
                                onChange={(e) => updateAccessoryItem(item.id, 'usagePrice', Number(e.target.value))}
                                className="min-w-20 max-w-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                                min="0"
                                style={{ width: `${Math.max(80, Math.min(128, (item.usagePrice || 0).toString().length * 8 + 24))}px` }}
                              />
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-700">
                              {formatCurrency(item.costPerPiece)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-4 min-h-[80px] align-top">
                      <div className="flex flex-col">
                        <div className={`flex items-center ${!item.isVaporizer ? 'pt-3' : 'pt-1'}`}>
                          <CurrencyDollarIcon className="w-4 h-4 mr-1 text-green-500" />
                          {item.isVaporizer ? (
                            <div className="flex flex-col">
                              <input
                                type="number"
                                value={item.sellingPrice || 0}
                                onChange={(e) => updateAccessoryItem(item.id, 'sellingPrice', Number(e.target.value))}
                                className="min-w-20 max-w-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                                min="0"
                                style={{ width: `${Math.max(80, Math.min(128, (item.sellingPrice || 0).toString().length * 8 + 24))}px` }}
                              />
                            </div>
                          ) : (
                            <>
                              <>
                                <span className="text-sm font-medium text-green-700">
                                  {formatCurrency(item.pricePerItem)}
                                </span>
                              </>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Total Price */}
                    <td className="py-3 px-4 min-h-[80px] align-top">
                      <div className="flex flex-col h-full justify-start">
                        <div className="flex items-center pt-3">
                          <CurrencyDollarIcon className="w-4 h-4 mr-1 text-blue-500" />
                          <span className="text-sm font-semibold text-blue-700">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 min-h-[80px] align-top">
                      <div className="flex flex-col h-full justify-start">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAccessoryItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Button */}
      <Button
        type="button"
        onClick={addAccessoryItem}
        variant="outline"
        size="sm"
        className="mt-2 text-purple-700 border-purple-300 hover:bg-purple-50"
      >
        <PlusIcon className="w-4 h-4 mr-1" />
        Add Item
      </Button>

      {/* Vaporizer Pricing Information */}
      {accessoryItems.some(item => item.isVaporizer && item.category) && (
        <div className="mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CubeIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">
                Vaporizer Pricing Guide
              </span>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span><strong>Usage Fee (Cost Price):</strong> Charge for using your vaporizer - NOT deducted from inventory</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span><strong>Selling Price:</strong> Charge for selling vaporizer - WILL be deducted from inventory</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span><strong>Both Empty:</strong> Customer uses vaporizer for free - NOT deducted, NOT charged</span>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
