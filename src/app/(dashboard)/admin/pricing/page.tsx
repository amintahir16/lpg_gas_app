'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  PencilIcon, 
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CalculatorIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface MarginCategory {
  id: string;
  name: string;
  customerType: string;
  marginPerKg: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: {
    b2cCustomers: number;
    b2bCustomers: number;
  };
}

interface PlantPrice {
  id: string;
  date: string;
  plantPrice118kg: number;
  notes: string | null;
  createdAt: string;
  createdByUser: {
    name: string;
    email: string;
  };
}

export default function PricingManagementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MarginCategory[]>([]);
  const [plantPrices, setPlantPrices] = useState<PlantPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    marginPerKg: 0,
    description: ''
  });
  const [newPriceForm, setNewPriceForm] = useState({
    plantPrice118kg: '',
    notes: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, pricesRes] = await Promise.all([
        fetch('/api/admin/margin-categories'),
        fetch('/api/admin/plant-prices?limit=10')
      ]);
      
      if (!categoriesRes.ok) {
        const errorText = await categoriesRes.text();
        console.error('Categories API error:', errorText);
        if (categoriesRes.status === 401) {
          throw new Error('Authentication required. Please log in as an admin user.');
        }
        throw new Error(`Categories API failed: ${categoriesRes.status} - ${errorText}`);
      }
      
      if (!pricesRes.ok) {
        const errorText = await pricesRes.text();
        console.error('Prices API error:', errorText);
        if (pricesRes.status === 401) {
          throw new Error('Authentication required. Please log in as an admin user.');
        }
        throw new Error(`Prices API failed: ${pricesRes.status} - ${errorText}`);
      }
      
      const [categoriesData, pricesData] = await Promise.all([
        categoriesRes.json(),
        pricesRes.json()
      ]);
      
      setCategories(categoriesData);
      setPlantPrices(pricesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('Authentication required')) {
        showMessage('error', 'Please log in as an admin user to access pricing management. Use admin@lpg.com / admin123');
      } else {
        showMessage('error', `Failed to load pricing data: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditingCategory = (category: MarginCategory) => {
    setEditingCategoryId(category.id);
    setEditForm({
      name: category.name,
      marginPerKg: Number(category.marginPerKg),
      description: category.description || ''
    });
  };

  const cancelEditingCategory = () => {
    setEditingCategoryId(null);
    setEditForm({ name: '', marginPerKg: 0, description: '' });
  };

  const handleUpdateCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/admin/margin-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update category');
      }

      showMessage('success', 'Category updated successfully');
      cancelEditingCategory();
      fetchData();
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      showMessage('error', errorMessage);
    }
  };

  const handleToggleCategoryActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/margin-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle category status');
      }

      showMessage('success', `Category ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling category:', error);
      showMessage('error', 'Failed to update category status');
    }
  };

  const handleSetPlantPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/plant-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPriceForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set plant price');
      }

      showMessage('success', 'Plant price set successfully');
      setNewPriceForm({ plantPrice118kg: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error setting plant price:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set plant price';
      showMessage('error', errorMessage);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const b2cCategories = categories.filter(c => c.customerType === 'B2C');
  const b2bCategories = categories.filter(c => c.customerType === 'B2B');

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading pricing management...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Margin-Based Pricing Management</h1>
          <p className="text-gray-600">
            Manage pricing categories, margins, and daily plant prices
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Settings
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Daily Plant Price Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            Daily Plant Price Input
          </CardTitle>
          <CardDescription>Set today's plant price for 11.8kg cylinder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPlantPrice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plantPrice118kg">Plant Price (11.8kg) - PKR</Label>
                <Input
                  id="plantPrice118kg"
                  type="number"
                  value={newPriceForm.plantPrice118kg}
                  onChange={(e) => setNewPriceForm({ ...newPriceForm, plantPrice118kg: e.target.value })}
                  placeholder="2750"
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={newPriceForm.notes}
                  onChange={(e) => setNewPriceForm({ ...newPriceForm, notes: e.target.value })}
                  placeholder="Market conditions, supplier notes..."
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              Set Today's Plant Price
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* B2C Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CurrencyDollarIcon className="w-6 h-6" />
            B2C (Home Customers) Pricing
          </CardTitle>
          <CardDescription>Pricing categories for residential customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Category Name</th>
                  <th className="text-right p-3">Margin (Rs/kg)</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-center p-3">Customers</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {b2cCategories.map(category => (
                  <tr key={category.id} className="border-b hover:bg-gray-50">
                    {editingCategoryId === category.id ? (
                      <>
                        <td className="p-3">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={editForm.marginPerKg}
                            onChange={(e) => setEditForm({ ...editForm, marginPerKg: parseFloat(e.target.value) })}
                            className="text-right"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Description (optional)"
                          />
                        </td>
                        <td className="p-3 text-center">
                          {category._count.b2cCustomers}
                        </td>
                        <td className="p-3 text-center">
                          {category.isActive ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateCategory(category.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingCategory}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-medium">{category.name}</td>
                        <td className="p-3 text-right font-bold text-green-600">
                          Rs {category.marginPerKg}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {category.description || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                            {category._count.b2cCustomers}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {category.isActive ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingCategory(category)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={category.isActive ? "destructive" : "default"}
                              onClick={() => handleToggleCategoryActive(category.id, category.isActive)}
                            >
                              {category.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* B2B Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CurrencyDollarIcon className="w-6 h-6" />
            B2B (Industries & Restaurants) Pricing
          </CardTitle>
          <CardDescription>Pricing categories for commercial customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Category Name</th>
                  <th className="text-right p-3">Margin (Rs/kg)</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-center p-3">Customers</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {b2bCategories.map(category => (
                  <tr key={category.id} className="border-b hover:bg-gray-50">
                    {editingCategoryId === category.id ? (
                      <>
                        <td className="p-3">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={editForm.marginPerKg}
                            onChange={(e) => setEditForm({ ...editForm, marginPerKg: parseFloat(e.target.value) })}
                            className="text-right"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Description (optional)"
                          />
                        </td>
                        <td className="p-3 text-center">
                          {category._count.b2bCustomers}
                        </td>
                        <td className="p-3 text-center">
                          {category.isActive ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateCategory(category.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingCategory}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-medium">{category.name}</td>
                        <td className="p-3 text-right font-bold text-green-600">
                          Rs {category.marginPerKg}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {category.description || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                            {category._count.b2bCustomers}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {category.isActive ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingCategory(category)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={category.isActive ? "destructive" : "default"}
                              onClick={() => handleToggleCategoryActive(category.id, category.isActive)}
                            >
                              {category.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plant Price History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalculatorIcon className="w-6 h-6" />
            Recent Plant Prices
          </CardTitle>
          <CardDescription>Last 10 plant price entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Price (11.8kg)</th>
                  <th className="text-left p-3">Notes</th>
                  <th className="text-left p-3">Set By</th>
                </tr>
              </thead>
              <tbody>
                {plantPrices.map(price => (
                  <tr key={price.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(price.date).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-bold text-green-600">
                      Rs {price.plantPrice118kg}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {price.notes || '-'}
                    </td>
                    <td className="p-3 text-sm">
                      {price.createdByUser.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How Margin-Based Pricing Works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Admin sets daily plant price (base price for 11.8kg cylinder)</li>
            <li>System calculates cost per kg: Plant Price ÷ 11.8</li>
            <li>Adds category margin: Cost per kg + Margin per kg = End price per kg</li>
            <li>Calculates final prices: End price per kg × cylinder size</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            <strong>Example:</strong> Plant Price = Rs 2,750 | Margin = Rs 23/kg<br />
            Cost/kg = 2,750 ÷ 11.8 = Rs 233 | End Price/kg = 233 + 23 = Rs 256<br />
            11.8kg = Rs 3,020 | 15kg = Rs 3,840 | 45.4kg = Rs 11,622
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
