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
  ClockIcon,
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

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

export default function AdminDashboardPage() {
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
        throw new Error('Failed to fetch dashboard stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Customers',
      value: stats?.totalCustomers?.toString() || '0',
      change: '+12%',
      changeType: 'positive',
      icon: UsersIcon,
      description: 'From last month'
    },
    {
      title: 'Active Cylinders',
      value: stats?.activeCylinders?.toString() || '0',
      change: '+5%',
      changeType: 'positive',
      icon: CubeIcon,
      description: 'Currently in circulation'
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats?.monthlyRevenue?.toLocaleString() || '0'}`,
      change: '+8%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      description: 'From last month'
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders?.toString() || '0',
      change: '-2%',
      changeType: 'negative',
      icon: ClockIcon,
      description: 'Awaiting processing'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">Error: {error}</p>
          <Button onClick={fetchDashboardStats} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your LPG gas cylinder business operations</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Admin Access
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                {card.changeType === 'positive' ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {card.change}
                </span>
                <span className="ml-1">{card.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/customers">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <UsersIcon className="h-6 w-6" />
                <span>Manage Customers</span>
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <CubeIcon className="h-6 w-6" />
                <span>Inventory</span>
              </Button>
            </Link>
            <Link href="/admin/pricing">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <CurrencyDollarIcon className="h-6 w-6" />
                <span>Pricing</span>
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <ChartBarIcon className="h-6 w-6" />
                <span>Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {stats?.recentActivities && stats.recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activities and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.type}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.title}</div>
                        <div className="text-sm text-gray-500">{activity.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{activity.time}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          activity.status === 'success'
                            ? 'default'
                            : activity.status === 'warning'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {activity.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
