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
      details: cylinderTypeStats.length > 0
        ? cylinderTypeStats.map(stat => `${stat.total} ${stat.type.replace(/Cylinder \((.*?)\)/, '$1').split(' (')[0]}`).join(' | ')
        : "No cylinder data"
    },
    {
      title: "Total System Cylinders",
      value: stats.totalCylinders + stats.cylindersWithCustomers,
      subtitle: "Inventory & Rented",
      icon: CubeIcon,
      href: null,
      color: "bg-green-500",
      details: `${stats.totalCylinders} in Inventory | ${stats.cylindersWithCustomers} with Customers`
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-600 font-medium">
            Comprehensive inventory overview and management
          </p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {dashboardCards.map((card, index) => (
          <Card
            key={index}
            className={`border-0 shadow-sm bg-white/80 backdrop-blur-sm transition-shadow ${card.href ? 'hover:shadow-md cursor-pointer' : ''}`}
            onClick={() => card.href ? window.location.href = card.href : null}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-semibold text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${card.color}`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 px-4 pt-1">
              <div className="text-xl font-bold text-gray-900 mb-0.5">
                {card.value.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mb-1 font-medium">
                {card.subtitle}
              </p>
              <p className="text-[10px] text-gray-400">
                {card.details}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cylinder Type Breakdown */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm mt-4">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-gray-900">
            Cylinder Inventory by Type & Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-md border border-gray-100 shadow-sm mx-4 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 tracking-wide">
                    Cylinder Type
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 tracking-wide w-24">
                    Full
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 tracking-wide w-24">
                    Empty
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 tracking-wide w-24">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {cylinderTypeStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-gray-500 italic">
                      No cylinder data available
                    </td>
                  </tr>
                ) : (
                  cylinderTypeStats.map((stat, index) => {
                    // Simple logic to give different badge colors based on cylinder type name
                    const name = stat.type.toLowerCase();
                    let badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
                    if (name.includes('domestic')) badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                    else if (name.includes('commercial')) badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
                    else if (name.includes('standard')) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";

                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors duration-150 group">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`px-2 py-0.5 font-medium shadow-sm border text-xs h-6 ${badgeColor}`}
                          >
                            <CubeIcon className="w-3 h-3 mr-1 opacity-70" />
                            {stat.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50 text-green-700 font-semibold text-xs group-hover:bg-green-100 transition-colors">
                            {stat.full}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-50 text-orange-700 font-semibold text-xs group-hover:bg-orange-100 transition-colors">
                            {stat.empty}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-gray-50 text-gray-900 font-bold text-xs border border-gray-100 group-hover:border-gray-300 transition-colors">
                            {stat.total}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm mt-4">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => window.location.href = '/inventory/cylinders/add'}
            >
              <CubeIcon className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">Add Cylinder</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => window.location.href = '/inventory/store-vehicles'}
            >
              <BuildingStorefrontIcon className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">Manage Stores</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => window.location.href = '/inventory/accessories'}
            >
              <WrenchScrewdriverIcon className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">Add Equipment</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => window.location.href = '/inventory/reports'}
            >
              <ChartBarIcon className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}