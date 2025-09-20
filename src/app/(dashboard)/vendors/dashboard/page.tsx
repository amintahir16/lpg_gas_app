'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Flame, 
  Settings, 
  Wrench, 
  Zap,
  TrendingUp,
  DollarSign,
  Calendar,
  Plus,
  Eye,
  Edit,
  BarChart3
} from 'lucide-react';

interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  category: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  purchaseEntries?: any[];
  financialReports?: any[];
}

interface CategoryStats {
  category: string;
  vendorCount: number;
  totalPurchases: number;
  recentActivity: number;
}

const vendorCategories = [
  {
    key: 'cylinder-purchase',
    label: 'Cylinder Purchase',
    icon: ShoppingCart,
    color: 'bg-blue-500'
  },
  {
    key: 'gas-purchase',
    label: 'Gas Purchase',
    icon: Flame,
    color: 'bg-green-500'
  },
  {
    key: 'vaporizer-purchase',
    label: 'Vaporizer Purchase',
    icon: Settings,
    color: 'bg-purple-500'
  },
  {
    key: 'accessories-purchase',
    label: 'Accessories Purchase',
    icon: Wrench,
    color: 'bg-orange-500'
  },
  {
    key: 'valves-purchase',
    label: 'Valves Purchase',
    icon: Zap,
    color: 'bg-red-500'
  }
];

export default function VendorDashboardPage() {
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const fetchCategoryStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors/stats');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setCategoryStats(data.stats);
    } catch (err) {
      console.error('Error fetching category stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch category stats');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryKey: string) => {
    return vendorCategories.find(cat => cat.key === categoryKey) || vendorCategories[0];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage vendors by categories and track purchases</p>
        </div>
        <Link href="/vendors">
          <Button variant="outline" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View All Vendors
          </Button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900">
                {categoryStats.reduce((sum, stat) => sum + stat.vendorCount, 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {categoryStats.filter(stat => stat.vendorCount > 0).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Activity</p>
              <p className="text-2xl font-bold text-gray-900">
                {categoryStats.reduce((sum, stat) => sum + stat.recentActivity, 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">
                PKR {categoryStats.reduce((sum, stat) => sum + stat.totalPurchases, 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Vendor Categories */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendorCategories.map((category) => {
            const stats = categoryStats.find(stat => stat.category === category.key);
            const IconComponent = category.icon;
            
            return (
              <Link key={category.key} href={`/vendors/category/${category.key}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-12 w-12 ${category.color} rounded-lg flex items-center justify-center`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary">
                      {stats?.vendorCount || 0} vendors
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {category.label}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Recent: {stats?.recentActivity || 0}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/vendors/category/${category.key}`}>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/vendors/category/${category.key}?action=add`}>
                        <Button size="sm" className="flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/vendors/category/cylinder-purchase">
            <Button variant="outline" className="justify-start h-auto p-4 w-full">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Cylinder Purchase</p>
                  <p className="text-sm text-gray-500">Manage cylinder vendors</p>
                </div>
              </div>
            </Button>
          </Link>
          
          <Link href="/vendors/category/gas-purchase">
            <Button variant="outline" className="justify-start h-auto p-4 w-full">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Gas Purchase</p>
                  <p className="text-sm text-gray-500">Manage gas vendors</p>
                </div>
              </div>
            </Button>
          </Link>
          
          <Link href="/vendors/category/accessories-purchase">
            <Button variant="outline" className="justify-start h-auto p-4 w-full">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-orange-600" />
                <div className="text-left">
                  <p className="font-medium">Accessories</p>
                  <p className="text-sm text-gray-500">Manage accessories vendors</p>
                </div>
              </div>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
