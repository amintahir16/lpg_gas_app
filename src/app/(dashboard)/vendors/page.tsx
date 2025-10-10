"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
  ShoppingBagIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface VendorCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  vendorCount: number;
  sortOrder: number;
}

export default function VendorsPage() {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCategories();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const fetchCategories = async () => {
    try {
      console.log('🔄 Fetching categories...');
      console.log('Session status:', status);
      console.log('User:', session?.user);
      
      const response = await fetch('/api/vendor-categories');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch categories`);
      }
      
      const data = await response.json();
      console.log('✅ Categories fetched:', data);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      alert(`Error loading categories: ${error.message}\n\nPlease check:\n1. You are logged in\n2. Browser console for details\n3. Server is running`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('/api/vendor-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          description: newCategoryDescription
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create category');
        return;
      }

      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowAddForm(false);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const getCategoryIcon = (slug: string) => {
    const iconMap: { [key: string]: any } = {
      'cylinder_purchase': CubeIcon,
      'gas_purchase': BuildingStorefrontIcon,
      'vaporizer_purchase': WrenchScrewdriverIcon,
      'accessories_purchase': ShoppingBagIcon,
      'valves_purchase': CogIcon,
    };
    return iconMap[slug] || CubeIcon;
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    return colors[index % colors.length];
  };

  // Show loading state
  if (status === 'loading' || loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading vendor categories...</div>
        </div>
      </div>
    );
  }

  // Show login required
  if (status === 'unauthenticated') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Login Required
            </h3>
            <p className="text-gray-500">
              Please log in to access the vendor management system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show session debug info
  if (status === 'authenticated') {
    console.log('✅ User authenticated:', {
      name: session?.user?.name,
      email: session?.user?.email,
      role: session?.user?.role,
      id: session?.user?.id
    });
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Management</h1>
        <p className="text-gray-600">
          Manage your vendors by category. Track purchases, payments, and financial reports.
        </p>
        {/* Debug info */}
        <div className="mt-2 text-sm text-gray-500">
          User: {session?.user?.name || session?.user?.email} | 
          Role: {session?.user?.role} | 
          Status: {status}
        </div>
      </div>

      {/* Add Category Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Category
        </Button>
      </div>

      {/* Add Category Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Vendor Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Cylinder Purchase, Gas Purchase"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Brief description of this category"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit">Create Category</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCategoryName('');
                    setNewCategoryDescription('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 mb-4">
              <CubeIcon className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No vendor categories yet
            </h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first vendor category
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const IconComponent = getCategoryIcon(category.slug);
            const colorClass = getCategoryColor(index);

            return (
              <Link
                key={category.id}
                href={`/vendors/category/${category.id}`}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
                        <IconComponent className={`w-8 h-8 ${colorClass.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {category.vendorCount}
                        </div>
                        <div className="text-sm text-gray-500">
                          {category.vendorCount === 1 ? 'Vendor' : 'Vendors'}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="text-sm text-blue-600 font-medium hover:text-blue-700">
                        View Vendors →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}