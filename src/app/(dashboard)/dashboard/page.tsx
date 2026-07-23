'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
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
  ArrowPathIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
  CreditCardIcon,
  DocumentArrowDownIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  buildFinancialPeriodQuery,
  chartDescriptionForPeriod,
  resolveFinancialPeriod,
  todayLocalDate,
  type FinancialPeriodMode,
} from '@/lib/financial-period';
import { FinancialPeriodFilter } from '@/components/FinancialPeriodFilter';
import { sharePdfBlob, downloadPdfBlob } from '@/lib/sharePdf';
import {
  buildSalesActivitiesPdf,
  salesActivitiesPdfFileName,
} from '@/lib/sales-activities-pdf';

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  amount: number;
  status: 'success' | 'warning' | 'error';
  transactionId?: string;
  channel?: 'b2b' | 'b2c';
  transactionType?: string;
  totalAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  paymentStatus?: string;
  customerId?: string;
  customerName?: string;
  billSno?: string;
  recordedBy?: string | null;
}

interface DashboardStats {
  kpis: {
    totalCustomers: number;
    activeCylinders: number;
    rangeRevenue: number;
    rangeProfit: number;
    rangeExpenses: number;
    rangeSalaries: number;
    actualProfit: number;
    rangePayments: number;
    vendorBalance: number;
  };
  period?: FinancialPeriodMode;
  label?: string;
  revenueChartData: any[];
  expensesChartData: any[];
  cylinderStatusData: any[];
  accessoryInventoryData: any[];
  recentActivities: RecentActivity[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<FinancialPeriodMode>('month');
  const [date, setDate] = useState(todayLocalDate);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfBusy, setPdfBusy] = useState<'download' | 'share' | null>(null);

  const periodLabel = useMemo(
    () => resolveFinancialPeriod({ period, date, month, year }).label,
    [period, date, month, year]
  );

  const activityColumnTotals = useMemo(() => {
    const rows = stats?.recentActivities || [];
    return rows.reduce(
      (acc, a) => {
        acc.total += a.totalAmount ?? a.amount ?? 0;
        acc.paid += a.paidAmount ?? 0;
        acc.unpaid += a.unpaidAmount ?? 0;
        return acc;
      },
      { total: 0, paid: 0, unpaid: 0 }
    );
  }, [stats?.recentActivities]);

  useEffect(() => {
    fetchDashboardStats();
  }, [period, date, month, year]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams(
        buildFinancialPeriodQuery({ period, date, month, year })
      );
      params.append('_t', Date.now().toString());

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

  const paymentStatusMeta = (status?: string) => {
    switch (status) {
      case 'FULLY_PAID':
        return { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' };
      case 'PARTIAL':
        return { label: 'Partial', className: 'bg-amber-100 text-amber-800' };
      case 'UNPAID':
        return { label: 'Unpaid', className: 'bg-rose-100 text-rose-800' };
      case 'RECEIVED':
        return { label: 'Received', className: 'bg-blue-100 text-blue-800' };
      default:
        return { label: status?.replace(/_/g, ' ') || '—', className: 'bg-gray-100 text-gray-700' };
    }
  };

  const typeBadgeClass = (type: string) => {
    if (type === 'b2b_payment') return 'text-indigo-700 border-indigo-200 bg-indigo-50';
    if (type === 'b2b_sale') return 'text-blue-700 border-blue-200 bg-blue-50';
    return 'text-green-700 border-green-200 bg-green-50';
  };

  const buildActivitiesPdfBlob = () => {
    if (!stats) throw new Error('No dashboard data');
    return buildSalesActivitiesPdf({
      periodLabel: stats.label || periodLabel,
      activities: stats.recentActivities.map((a) => ({
        title: a.title,
        customerName: a.customerName || 'Unknown',
        billSno: a.billSno,
        totalAmount: a.totalAmount ?? a.amount,
        paidAmount: a.paidAmount ?? 0,
        unpaidAmount: a.unpaidAmount ?? 0,
        paymentStatus: a.paymentStatus || 'UNPAID',
        recordedBy: a.recordedBy || null,
        time: a.time,
        description: a.description,
      })),
    });
  };

  const handleDownloadActivities = async () => {
    if (!stats?.recentActivities.length) return;
    try {
      setPdfBusy('download');
      const blob = buildActivitiesPdfBlob();
      const fileName = salesActivitiesPdfFileName(stats.label || periodLabel);
      await downloadPdfBlob(blob, fileName);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setPdfBusy(null);
    }
  };

  const handleShareActivities = async () => {
    if (!stats?.recentActivities.length) return;
    try {
      setPdfBusy('share');
      const blob = buildActivitiesPdfBlob();
      const fileName = salesActivitiesPdfFileName(stats.label || periodLabel);
      await sharePdfBlob({
        blob,
        fileName,
        title: 'Sales Activities Report',
        text: `Sales activities for ${stats.label || periodLabel}`,
      });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to share PDF');
    } finally {
      setPdfBusy(null);
    }
  };

  // Custom Tooltip for Pie Chart
  const cylinderNames = ['With Customers', 'Full (In Stock)', 'Empty (In Stock)'];
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload ?? payload[0];
      const isCylinder = cylinderNames.includes(payload[0].name);

      if (entry.category) {
        return (
          <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg max-w-xs">
            <p className="text-xs font-medium text-gray-500">{entry.category}</p>
            <p className="font-semibold text-gray-800">{entry.type}</p>
            <p className="text-blue-600 font-bold">{payload[0].value} Units</p>
          </div>
        );
      }

      const breakdown = entry.breakdown as { type: string; quantity: number }[] | undefined;

      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg max-w-xs">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-blue-600 font-bold">
            {payload[0].value} {isCylinder ? 'Cylinders' : 'Units'}
          </p>
          {breakdown && breakdown.length > 0 && (
            <ul className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
              {breakdown.map((line) => (
                <li key={line.type} className="text-xs text-gray-600 flex justify-between gap-3">
                  <span>{line.type}</span>
                  <span className="font-medium text-gray-800">{line.quantity}</span>
                </li>
              ))}
            </ul>
          )}
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
            <Button onClick={() => fetchDashboardStats()}>Try Again</Button>
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
        <div className="flex flex-wrap items-center gap-3">
          <FinancialPeriodFilter
            period={period}
            date={date}
            month={month}
            year={year}
            onPeriodChange={setPeriod}
            onDateChange={setDate}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
          <Button
            onClick={() => fetchDashboardStats()}
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

      {/* Stats Cards — Period Revenue & Est. Profit: SUPER_ADMIN only */}
      <div
        className={`grid grid-cols-2 gap-3 ${isSuperAdmin ? 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8' : 'md:grid-cols-2 lg:grid-cols-4'}`}
      >
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
            <UsersIcon className="w-10 h-10 text-white" />
          </div>
          <CardContent className="p-3 relative z-10">
            <p className="text-xs font-medium text-blue-100 mb-1 truncate">Active Customers</p>
            <h3 className="text-xl font-bold text-white truncate">{stats.kpis.totalCustomers.toLocaleString()}</h3>
            <p className="text-[10px] text-blue-200 mt-1 truncate">B2B & B2C</p>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
                <CurrencyDollarIcon className="w-10 h-10 text-white" />
              </div>
              <CardContent className="p-3 relative z-10">
                <p className="text-xs font-medium text-emerald-100 mb-1 truncate">Period Revenue</p>
                <h3 className="text-xl font-bold text-white truncate">{formatCurrency(stats.kpis.rangeRevenue)}</h3>
                <p className="text-[10px] text-emerald-200 mt-1 truncate">{stats.label || periodLabel}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600 relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
                <ChartBarIcon className="w-10 h-10 text-white" />
              </div>
              <CardContent className="p-3 relative z-10">
                <p className="text-xs font-medium text-violet-100 mb-1 truncate">Est. Profit</p>
                <h3 className="text-xl font-bold text-white truncate">{formatCurrency(stats.kpis.rangeProfit)}</h3>
                <p className="text-[10px] text-violet-200 mt-1 truncate">Gross margins</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-500 to-emerald-600 relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
                <BanknotesIcon className="w-10 h-10 text-white" />
              </div>
              <CardContent className="p-3 relative z-10">
                <p className="text-xs font-medium text-teal-100 mb-1 truncate">Actual Profit</p>
                <h3 className={`text-xl font-bold truncate ${stats.kpis.actualProfit >= 0 ? 'text-white' : 'text-red-200'}`}>{formatCurrency(stats.kpis.actualProfit)}</h3>
                <p className="text-[10px] text-teal-200 mt-1 truncate">After all deductions</p>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="border-0 shadow-sm bg-gradient-to-br from-fuchsia-500 to-pink-600 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
            <CreditCardIcon className="w-10 h-10 text-white" />
          </div>
          <CardContent className="p-3 relative z-10">
            <p className="text-xs font-medium text-fuchsia-100 mb-1 truncate">Vendor Payments</p>
            <h3 className="text-xl font-bold text-white truncate">{formatCurrency(stats.kpis.rangePayments || 0)}</h3>
            <p className="text-[10px] text-fuchsia-200 mt-1 truncate">Paid to all vendors</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-500 to-orange-500 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
            <BuildingOfficeIcon className="w-10 h-10 text-white" />
          </div>
          <CardContent className="p-3 relative z-10">
            <p className="text-xs font-medium text-rose-100 mb-1 truncate">Period Expenses</p>
            <h3 className="text-xl font-bold text-white truncate">{formatCurrency(stats.kpis.rangeExpenses)}</h3>
            <p className="text-[10px] text-rose-200 mt-1 truncate">Office & daily</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-cyan-500 to-cyan-600 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
            <BuildingStorefrontIcon className="w-10 h-10 text-white" />
          </div>
          <CardContent className="p-3 relative z-10">
            <p className="text-xs font-medium text-cyan-100 mb-1 truncate">Vendor Balance</p>
            <h3 className="text-xl font-bold text-white truncate">{formatCurrency(stats.kpis.vendorBalance)}</h3>
            <p className="text-[10px] text-cyan-200 mt-1 truncate">Owed in period</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-30 transition-opacity">
            <CubeIcon className="w-10 h-10 text-white" />
          </div>
          <CardContent className="p-3 relative z-10">
            <p className="text-xs font-medium text-amber-100 mb-1 truncate">Cylinders Out</p>
            <h3 className="text-xl font-bold text-white truncate">{stats.kpis.activeCylinders.toLocaleString()}</h3>
            <p className="text-[10px] text-amber-200 mt-1 truncate">With customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Revenue Trend (B2B vs B2C)</CardTitle>
            <CardDescription className="text-xs">{chartDescriptionForPeriod(period)}</CardDescription>
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

        {/* Expenses Trend */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Expenses Trend</CardTitle>
            <CardDescription className="text-xs">
              Office (blue) vs vehicle (amber) — {chartDescriptionForPeriod(period).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.expensesChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="officeExpenses"
                    name="Office"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="vehicleExpenses"
                    name="Vehicle"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ fill: '#d97706', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

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
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.accessoryInventoryData.map((entry, index) => (
                        <Cell key={`acc-cell-${index}`} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend verticalAlign="bottom" height={50} content={() => {
                      const grouped: Record<string, { color: string; types: string[] }> = {};
                      stats!.accessoryInventoryData.forEach((entry: { category: string; categoryColor: string; type: string }) => {
                        if (!grouped[entry.category]) {
                          grouped[entry.category] = { color: entry.categoryColor, types: [] };
                        }
                        grouped[entry.category].types.push(entry.type);
                      });
                      return (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-2">
                          {Object.entries(grouped).map(([cat, { color, types }]) => (
                            <span key={cat} className="inline-flex items-center text-xs text-gray-600">
                              <span className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-semibold text-gray-800">{cat}</span>
                              <span className="ml-1 text-gray-500">- {types.join(', ')}</span>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                <ClockIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                Recent Sales Activities
              </CardTitle>
              <CardDescription className="text-xs">
                Sales &amp; payments in {stats.label || periodLabel}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleShareActivities}
                disabled={!stats.recentActivities.length || !!pdfBusy}
              >
                <ShareIcon className="w-3.5 h-3.5 mr-1" />
                {pdfBusy === 'share' ? 'Sharing…' : 'Share'}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleDownloadActivities}
                disabled={!stats.recentActivities.length || !!pdfBusy}
              >
                <DocumentArrowDownIcon className="w-3.5 h-3.5 mr-1" />
                {pdfBusy === 'download' ? 'Preparing…' : 'Download'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Total</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Paid</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Unpaid</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">By</TableHead>
                  <TableHead className="font-semibold text-gray-700">Time</TableHead>
                  <TableHead className="font-semibold text-gray-700">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No sales or payments found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentActivities.map((activity) => {
                    const pay = paymentStatusMeta(activity.paymentStatus);
                    const total = activity.totalAmount ?? activity.amount;
                    const paid = activity.paidAmount ?? 0;
                    const unpaid = activity.unpaidAmount ?? 0;
                    return (
                      <TableRow key={activity.id} className="hover:bg-gray-50/50">
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-semibold whitespace-nowrap ${typeBadgeClass(activity.type)}`}
                          >
                            {activity.title}
                          </Badge>
                          {activity.billSno ? (
                            <div className="text-[10px] text-gray-400 mt-0.5">Bill {activity.billSno}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {activity.customerName || 'Unknown'}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {activity.channel === 'b2c' ? 'B2C' : 'B2B'} customer
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">
                          {formatCurrency(paid)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            unpaid > 0 ? 'text-rose-700' : 'text-gray-400'
                          }`}
                        >
                          {formatCurrency(unpaid)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${pay.className}`}
                          >
                            {activity.paymentStatus === 'FULLY_PAID' ||
                            activity.paymentStatus === 'RECEIVED' ? (
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                            ) : activity.paymentStatus === 'UNPAID' ? (
                              <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                            ) : null}
                            {pay.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {activity.recordedBy || '—'}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                          {formatTime(activity.time)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[220px]">
                          <span className="line-clamp-2">{activity.description}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {stats.recentActivities.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                    <TableCell colSpan={2} className="font-bold text-gray-900">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {formatCurrency(activityColumnTotals.total)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">
                      {formatCurrency(activityColumnTotals.paid)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        activityColumnTotals.unpaid > 0 ? 'text-rose-700' : 'text-gray-500'
                      }`}
                    >
                      {formatCurrency(activityColumnTotals.unpaid)}
                    </TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}