"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { StatCardsSkeleton } from '@/components/skeletons';

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

const CYLINDER_COLOR_PALETTE = [
  { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'text-emerald-500' },
  { badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'text-purple-500' },
  { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'text-blue-500' },
  { badge: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'text-orange-500' },
  { badge: 'bg-pink-50 text-pink-700 border-pink-200', icon: 'text-pink-500' },
  { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'text-indigo-500' },
  { badge: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'text-teal-500' },
  { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: 'text-cyan-500' },
  { badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'text-rose-500' },
  { badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'text-amber-500' },
  { badge: 'bg-lime-50 text-lime-700 border-lime-200', icon: 'text-lime-500' },
  { badge: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'text-sky-500' },
  { badge: 'bg-violet-50 text-violet-700 border-violet-200', icon: 'text-violet-500' },
  { badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', icon: 'text-fuchsia-500' },
];

const getCylinderTypeColor = (type: string, index?: number) => {
  if (typeof index === 'number') {
    return CYLINDER_COLOR_PALETTE[index % CYLINDER_COLOR_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % CYLINDER_COLOR_PALETTE.length;
  return CYLINDER_COLOR_PALETTE[colorIndex];
};

export default function InventoryDashboard() {
  const router = useRouter();
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-600 font-medium">
            Comprehensive inventory overview and management
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <div className="h-3 w-32 bg-slate-200 animate-pulse rounded" />
                <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse" />
              </CardHeader>
              <CardContent className="pb-3 px-4 pt-1 space-y-1">
                <div className="h-7 w-20 bg-slate-200 animate-pulse rounded" />
                <div className="h-3 w-28 bg-slate-200 animate-pulse rounded" />
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
            onClick={() => card.href ? router.push(card.href) : null}
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

      {/* Cylinder Inventory by Type & Status */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-gray-900">
            Cylinder Inventory by Type & Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-2 px-4 font-semibold text-gray-600">Cylinder Type</th>
                  <th className="text-right py-2 px-4 font-semibold text-green-600">Full</th>
                  <th className="text-right py-2 px-4 font-semibold text-orange-600">Empty</th>
                  <th className="text-right py-2 px-4 font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cylinderTypeStats.length > 0 ? (
                  cylinderTypeStats.map((stat, index) => {
                    const typeColor = getCylinderTypeColor(stat.type, index);
                    return (
                      <tr key={index} className="hover:bg-gray-50/30">
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeColor.badge}`}>
                            <CubeIcon className={`w-3 h-3 mr-1 ${typeColor.icon}`} />
                            {stat.type.replace(/Cylinder \((.*?)\)/, '$1').split(' (')[0]}
                          </span>
                        </td>
                        <td className="text-right py-2.5 px-4 font-bold text-green-600">{stat.full}</td>
                        <td className="text-right py-2.5 px-4 font-bold text-orange-600">{stat.empty}</td>
                        <td className="text-right py-2.5 px-4 font-bold text-gray-900">{stat.total}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-gray-400">
                      No cylinder data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold text-gray-600">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => router.push('/inventory/cylinders/add')}
            >
              <CubeIcon className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">Add Cylinder</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => router.push('/inventory/store-vehicles')}
            >
              <BuildingStorefrontIcon className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">Manage Stores</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => router.push('/inventory/accessories')}
            >
              <WrenchScrewdriverIcon className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">Add Equipment</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-1.5"
              onClick={() => router.push('/inventory/reports')}
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