'use client';

import { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  CubeIcon, 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  type: 'customer' | 'cylinder' | 'payment' | 'alert';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'warning' | 'error';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([
    {
      title: 'Total Customers',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: UsersIcon,
      description: 'Active customers this month'
    },
    {
      title: 'Active Cylinders',
      value: '567',
      change: '+5%',
      changeType: 'positive',
      icon: CubeIcon,
      description: 'Cylinders currently rented'
    },
    {
      title: 'Monthly Revenue',
      value: '$45,678',
      change: '+8%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      description: 'Revenue this month'
    },
    {
      title: 'Pending Orders',
      value: '23',
      change: '-3%',
      changeType: 'negative',
      icon: ExclamationTriangleIcon,
      description: 'Orders awaiting processing'
    }
  ]);

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'customer',
      title: 'New Customer Registration',
      description: 'John Doe registered as a new customer',
      time: '2 hours ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'cylinder',
      title: 'Cylinder Rental',
      description: 'Cylinder CYL123456 rented to customer',
      time: '4 hours ago',
      status: 'success'
    },
    {
      id: '3',
      type: 'payment',
      title: 'Payment Received',
      description: 'Payment of $150 received from customer',
      time: '6 hours ago',
      status: 'success'
    },
    {
      id: '4',
      type: 'alert',
      title: 'Low Inventory Alert',
      description: '15kg cylinders running low (5 remaining)',
      time: '8 hours ago',
      status: 'warning'
    }
  ]);

  const [quickActions] = useState([
    { name: 'Add Customer', href: '/customers/new', icon: PlusIcon },
    { name: 'View Inventory', href: '/inventory', icon: EyeIcon },
    { name: 'Generate Report', href: '/reports', icon: EyeIcon },
  ]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <UsersIcon className="w-5 h-5" />;
      case 'cylinder':
        return <CubeIcon className="w-5 h-5" />;
      case 'payment':
        return <CurrencyDollarIcon className="w-5 h-5" />;
      case 'alert':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      default:
        return <EyeIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's what's happening with your LPG gas business today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="flex items-center space-x-2">
                {stat.changeType === 'positive' ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500">from last month</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to help you get started quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <action.icon className="w-6 h-6" />
                <span>{action.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest activities in your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>
              Important notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Low Inventory Alert
                    </p>
                    <p className="text-xs text-yellow-700">
                      15kg cylinders running low
                    </p>
                  </div>
                </div>
                <Badge variant="warning">5 left</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      New Customer Registration
                    </p>
                    <p className="text-xs text-blue-700">
                      John Doe registered today
                    </p>
                  </div>
                </div>
                <Badge variant="info">New</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Payment Received
                    </p>
                    <p className="text-xs text-green-700">
                      $150 payment processed
                    </p>
                  </div>
                </div>
                <Badge variant="success">Paid</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest financial transactions and activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">John Doe</TableCell>
                <TableCell>Cylinder Rental</TableCell>
                <TableCell>$50.00</TableCell>
                <TableCell>
                  <Badge variant="success">Completed</Badge>
                </TableCell>
                <TableCell>2024-01-15</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Jane Smith</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>$150.00</TableCell>
                <TableCell>
                  <Badge variant="success">Paid</Badge>
                </TableCell>
                <TableCell>2024-01-14</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mike Johnson</TableCell>
                <TableCell>Cylinder Return</TableCell>
                <TableCell>-$25.00</TableCell>
                <TableCell>
                  <Badge variant="warning">Pending</Badge>
                </TableCell>
                <TableCell>2024-01-13</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 