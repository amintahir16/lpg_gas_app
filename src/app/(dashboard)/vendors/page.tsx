"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  PencilIcon,
  TrashIcon,
  // Cylinder icons
  ArchiveBoxIcon, // Better representation for cylinders/containers
  // Gas icons  
  BoltIcon, // Lightning/energy for gas
  // Vaporizer icons
  CpuChipIcon, // Technology/electronic equipment
  // Accessories icons
  WrenchScrewdriverIcon, // Tools and accessories
  // Valves icons
  Cog6ToothIcon, // Control/mechanical components
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
  
  // Edit category state
  const [editingCategory, setEditingCategory] = useState<VendorCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');
  
  // Delete confirmation state
  const [deletingCategory, setDeletingCategory] = useState<VendorCategory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleEditCategory = (category: VendorCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || '');
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;

    try {
      const response = await fetch('/api/vendor-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategory.id,
          name: editCategoryName,
          description: editCategoryDescription
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update category');
        return;
      }

      setEditingCategory(null);
      setEditCategoryName('');
      setEditCategoryDescription('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleDeleteCategory = (category: VendorCategory) => {
    setDeletingCategory(category);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      const response = await fetch(`/api/vendor-categories?id=${deletingCategory.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
        return;
      }

      setDeletingCategory(null);
      setShowDeleteConfirm(false);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategoryDescription('');
  };

  const cancelDelete = () => {
    setDeletingCategory(null);
    setShowDeleteConfirm(false);
  };

  const getCategoryIcon = (slug: string) => {
    const iconMap: { [key: string]: any } = {
      'cylinder_purchase': ArchiveBoxIcon,      // Professional cylinder/container representation
      'gas_purchase': BoltIcon,                 // Energy/power symbol for gas
      'vaporizer_purchase': CpuChipIcon,        // Technology/electronic equipment
      'accessories_purchase': WrenchScrewdriverIcon, // Tools and accessories
      'valves_purchase': Cog6ToothIcon,         // Mechanical control components
    };
    return iconMap[slug] || ArchiveBoxIcon;
  };

  const getCategoryColor = (slug: string) => {
    const colorMap: { [key: string]: string } = {
      'cylinder_purchase': 'bg-blue-500',      // Blue for cylinders (trust, reliability)
      'gas_purchase': 'bg-green-500',          // Green for gas (natural, clean)
      'vaporizer_purchase': 'bg-purple-500',   // Purple for machinery (innovation, tech)
      'accessories_purchase': 'bg-orange-500', // Orange for accessories (energy, tools)
      'valves_purchase': 'bg-red-500',         // Red for valves (control, safety)
    };
    return colorMap[slug] || 'bg-gray-500';
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
        <div className="flex gap-3">
          <Link href="/vendors/credits">
            <Button variant="outline" className="flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5" />
              Credit Management
            </Button>
          </Link>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Category
          </Button>
        </div>
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
              <ShoppingBagIcon className="w-16 h-16 mx-auto" />
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
            const colorClass = getCategoryColor(category.slug);

            return (
              <Card key={category.id} className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gray-50 border border-gray-200`}>
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
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/vendors/category/${category.id}`}
                        className="text-sm text-blue-600 font-medium hover:text-blue-700"
                      >
                        View Vendors →
                      </Link>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            handleEditCategory(category);
                          }}
                          className="h-8 w-8 p-0"
                          title="Edit Category"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteCategory(category);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Category"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <Input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    placeholder="e.g., Cylinder Purchase, Gas Purchase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={editCategoryDescription}
                    onChange={(e) => setEditCategoryDescription(e.target.value)}
                    placeholder="Brief description of this category"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit">Update Category</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you sure you want to delete the category <strong>"{deletingCategory.name}"</strong>?
                </p>
                
                {deletingCategory.vendorCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <TrashIcon className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Cannot Delete Category
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>
                            This category has <strong>{deletingCategory.vendorCount}</strong> vendor(s). 
                            You must delete or move all vendors from this category before deleting it.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  {deletingCategory.vendorCount === 0 ? (
                    <>
                      <Button
                        onClick={confirmDeleteCategory}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete Category
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelDelete}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={cancelDelete}
                      className="w-full"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}