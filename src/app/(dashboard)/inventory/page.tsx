"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CubeIcon, 
  BuildingStorefrontIcon, 
  TruckIcon, 
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface InventoryStats {
  totalCylinders: number;
  cylindersByType: {
    domestic: number;
    standard: number;
    commercial: number;
  };
  cylindersWithCustomers: number;
  storeInventory: number;
  vehicleInventory: number;
  accessoriesCount: number;
}

interface CylinderTypeStats {
  type: string;
  full: number;
  empty: number;
  total: number;
}

export default function InventoryDashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    totalCylinders: 0,
    cylindersByType: { domestic: 0, standard: 0, commercial: 0 },
    cylindersWithCustomers: 0,
    storeInventory: 0,
    vehicleInventory: 0,
    accessoriesCount: 0
  });
  
  const [cylinderTypeStats, setCylinderTypeStats] = useState<CylinderTypeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryStats();
  }, []);

  const fetchInventoryStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setCylinderTypeStats(data.cylinderTypeStats);
      }
    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-gray-600 font-medium">Loading inventory overview...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const dashboardCards = [
    {
      title: "Total Cylinders Inventory",
      value: stats.totalCylinders,
      subtitle: "Full & Empty by Type",
      icon: CubeIcon,
      href: "/inventory/cylinders",
      color: "bg-blue-500",
      details: `${stats.cylindersByType.domestic} Domestic | ${stats.cylindersByType.standard} Standard | ${stats.cylindersByType.commercial} Commercial`
    },
    {
      title: "Store & Vehicle Inventory",
      value: stats.storeInventory + stats.vehicleInventory,
      subtitle: "Distributed Inventory",
      icon: BuildingStorefrontIcon,
      href: "/inventory/store-vehicles",
      color: "bg-green-500",
      details: `${stats.storeInventory} in Stores | ${stats.vehicleInventory} in Vehicles`
    },
    {
      title: "Cylinders with Customers",
      value: stats.cylindersWithCustomers,
      subtitle: "Currently Rented",
      icon: UserGroupIcon,
      href: "/inventory/customer-cylinders",
      color: "bg-purple-500",
      details: "Active rentals"
    },
    {
      title: "Accessories & Equipment",
      value: stats.accessoriesCount,
      subtitle: "Regulators, Pipes, Stoves",
      icon: WrenchScrewdriverIcon,
      href: "/inventory/accessories",
      color: "bg-orange-500",
      details: "Complete equipment inventory"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Comprehensive inventory overview and management
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={() => window.location.href = '/inventory/cylinders'}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            View Detailed Reports
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {dashboardCards.map((card, index) => (
          <Card 
            key={index} 
            className="border-0 shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => window.location.href = card.href}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {card.value.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 mb-2 font-medium">
                {card.subtitle}
              </p>
              <p className="text-xs text-gray-400">
                {card.details}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cylinder Type Breakdown */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Cylinder Inventory by Type & Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cylinder Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Full
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Empty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cylinderTypeStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary" className="font-semibold">
                        {stat.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">
                        {stat.full}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-orange-600">
                        {stat.empty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {stat.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/inventory/cylinders/add'}
            >
              <CubeIcon className="w-6 h-6" />
              <span className="text-sm font-medium">Add Cylinder</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/inventory/store-vehicles'}
            >
              <BuildingStorefrontIcon className="w-6 h-6" />
              <span className="text-sm font-medium">Manage Stores</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/inventory/accessories'}
            >
              <WrenchScrewdriverIcon className="w-6 h-6" />
              <span className="text-sm font-medium">Add Equipment</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/inventory/reports'}
            >
              <ChartBarIcon className="w-6 h-6" />
              <span className="text-sm font-medium">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}