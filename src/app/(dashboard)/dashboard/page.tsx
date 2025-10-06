'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  UsersIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

interface DashboardStats {
  totalCustomers: number;
  activeCylinders: number;
  monthlyRevenue: number;
  pendingOrders: number;
  recentActivities: RecentActivity[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Business overview and key metrics
          </p>
        </div>
        
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchDashboardStats} className="font-medium">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards: StatCard[] = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      change: '+12%',
      changeType: 'positive',
      icon: UsersIcon,
      description: 'Active customers this month'
    },
    {
      title: 'Active Cylinders',
      value: stats.activeCylinders.toLocaleString(),
      change: '+5%',
      changeType: 'positive',
      icon: CubeIcon,
      description: 'Cylinders currently rented'
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      change: '+8%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      description: 'Revenue this month'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toLocaleString(),
      change: '-3%',
      changeType: 'negative',
      icon: ExclamationTriangleIcon,
      description: 'Orders awaiting processing'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600 font-medium">
            Business overview and key metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            onClick={fetchDashboardStats}
            variant="outline"
            className="font-medium"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="flex items-center space-x-2 mt-2">
                {stat.changeType === 'positive' ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-600" />
                )}
                <p className={`text-xs font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Activities</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Latest business activities and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Activity</TableHead>
                <TableHead className="font-semibold text-gray-700">Description</TableHead>
                <TableHead className="font-semibold text-gray-700">Time</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-semibold text-gray-900">{activity.title}</TableCell>
                  <TableCell className="text-gray-700">{activity.description}</TableCell>
                  <TableCell className="text-gray-700">
                    <div className="flex items-center space-x-2" suppressHydrationWarning>
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(activity.time)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(activity.status) as any} className="font-semibold">
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 