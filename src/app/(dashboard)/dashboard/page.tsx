'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomSelect } from '@/components/ui/select-custom';
import {
  UsersIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  amount: number;
  status: 'success' | 'warning' | 'error';
}

interface DashboardStats {
  kpis: {
    totalCustomers: number;
    activeCylinders: number;
    rangeRevenue: number;
    rangeProfit: number;
  };
  revenueChartData: any[];
  cylinderStatusData: any[];
  accessoryInventoryData: any[];
  recentActivities: RecentActivity[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Filter State
  const [dateRangeFilter, setDateRangeFilter] = useState('30days');

  useEffect(() => {
    fetchDashboardStats(dateRangeFilter);
  }, [dateRangeFilter]);

  const fetchDashboardStats = async (filter: string) => {
    try {
      setLoading(true);

      let startDateStr = '';
      let endDateStr = new Date().toISOString();
      const today = new Date();

      if (filter === '7days') {
        startDateStr = subDays(today, 7).toISOString();
      } else if (filter === '30days') {
        startDateStr = subDays(today, 30).toISOString();
      } else if (filter === 'thisMonth') {
        startDateStr = startOfMonth(today).toISOString();
        endDateStr = endOfMonth(today).toISOString();
      } else if (filter === '6months') {
        startDateStr = subDays(today, 180).toISOString();
      } else if (filter === 'allTime') {
        startDateStr = new Date('2020-01-01').toISOString();
      }

      const params = new URLSearchParams();
      if (startDateStr) params.append('startDate', startDateStr);
      if (endDateStr) params.append('endDate', endDateStr);

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);

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
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Custom Tooltip for Pie Chart
  const cylinderNames = ['With Customers', 'Full (In Stock)', 'Empty (In Stock)'];
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const isCylinder = cylinderNames.includes(payload[0].name);
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-blue-600 font-bold">{payload[0].value} {isCylinder ? 'Cylinders' : 'Units'}</p>
        </div>
      );
    }
    return null;
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button onClick={() => fetchDashboardStats(dateRangeFilter)}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="w-6 h-6 mr-2 text-blue-600" />
            Business Overview
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Analytics and key metrics for selected period
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <CustomSelect
            value={dateRangeFilter}
            onChange={(val) => setDateRangeFilter(val)}
            options={[
              { value: '7days', label: 'Last 7 Days' },
              { value: '30days', label: 'Last 30 Days' },
              { value: 'thisMonth', label: 'This Month' },
              { value: '6months', label: 'Last 6 Months' },
              { value: 'allTime', label: 'All Time' },
            ]}
            className="w-[160px]"
          />
          <Button
            onClick={() => fetchDashboardStats(dateRangeFilter)}
            variant="outline"
            size="sm"
            className="h-9"
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <UsersIcon className="w-12 h-12 text-blue-600" />
          </div>
          <CardContent className="p-4 relative z-10">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Active Customers</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.kpis.totalCustomers.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">Combined B2B & B2C</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CurrencyDollarIcon className="w-12 h-12 text-green-600" />
          </div>
          <CardContent className="p-4 relative z-10">
            <p className="text-sm font-medium text-gray-500 mb-1">Period Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.kpis.rangeRevenue)}</h3>
            <p className="text-xs text-gray-400 mt-1">Selected date range</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <ChartBarIcon className="w-12 h-12 text-purple-600" />
          </div>
          <CardContent className="p-4 relative z-10">
            <p className="text-sm font-medium text-gray-500 mb-1">Est. Period Profit</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.kpis.rangeProfit)}</h3>
            <p className="text-xs text-gray-400 mt-1">Gross margins applied</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CubeIcon className="w-12 h-12 text-orange-600" />
          </div>
          <CardContent className="p-4 relative z-10">
            <p className="text-sm font-medium text-gray-500 mb-1">Cylinders With Customers</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.kpis.activeCylinders.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">Active in market</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend - Full Width */}
      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-gray-900">Revenue Trend (B2B vs B2C)</CardTitle>
          <CardDescription className="text-xs">Visualizing revenue across sales channels over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(value) => `Rs${(value / 1000)}k`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                <Bar dataKey="b2b" name="B2B Industries" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="b2c" name="B2C Homes" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cylinder Inventory Status */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Cylinder Master Status</CardTitle>
            <CardDescription className="text-xs">Live overview of physical cylinder assets.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.cylinderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.cylinderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Accessories Inventory Status */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Accessories Inventory</CardTitle>
            <CardDescription className="text-xs">Stock distribution of custom accessories.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full flex items-center justify-center">
              {stats.accessoryInventoryData && stats.accessoryInventoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.accessoryInventoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.accessoryInventoryData.map((entry, index) => (
                        <Cell key={`acc-cell-${index}`} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend verticalAlign="bottom" height={50} content={() => {
                      // Group items by category for a compact legend
                      const grouped: Record<string, { color: string; items: string[] }> = {};
                      stats!.accessoryInventoryData.forEach((entry: any) => {
                        const [category, itemName] = entry.name.split(' - ');
                        if (!grouped[category]) {
                          grouped[category] = { color: entry.fill, items: [] };
                        }
                        grouped[category].items.push(itemName);
                      });
                      return (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-2">
                          {Object.entries(grouped).map(([cat, { color, items }]) => (
                            <span key={cat} className="inline-flex items-center text-xs text-gray-600">
                              <span className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-semibold text-gray-800">{cat}</span>
                              <span className="ml-1 text-gray-500">- {items.join(', ')}</span>
                            </span>
                          ))}
                        </div>
                      );
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">No accessories in inventory</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center">
            <ClockIcon className="w-4 h-4 mr-1.5 text-gray-500" />
            Recent Sales Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Description</TableHead>
                  <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-700">Time</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No recent sales found.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentActivities.map((activity) => (
                    <TableRow key={activity.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <Badge variant="outline" className={`font-semibold ${activity.type === 'b2b_sale' ? 'text-blue-700 border-blue-200 bg-blue-50' : 'text-green-700 border-green-200 bg-green-50'}`}>
                          {activity.title}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 font-medium">{activity.description}</TableCell>
                      <TableCell className="font-bold text-gray-900">{formatCurrency(activity.amount)}</TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatTime(activity.time)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${activity.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {activity.status === 'success' ? (
                            <><CheckCircleIcon className="w-3 h-3 mr-1" /> Success</>
                          ) : (
                            <><ExclamationTriangleIcon className="w-3 h-3 mr-1" /> Voided</>
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}