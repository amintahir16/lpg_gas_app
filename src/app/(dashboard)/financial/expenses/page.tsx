'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowLeftIcon, BuildingOfficeIcon, PlusIcon,
    PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, TruckIcon, UserIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CustomSelect } from '@/components/ui/select-custom';
import {
    PAYMENT_METHOD_OPTIONS,
    formatPaymentMethodLabel,
} from '@/lib/payment-methods';
import {
    buildFinancialPeriodQuery,
    chartDescriptionForPeriod,
    combineLocalDateAndTime,
    resolveFinancialPeriod,
    todayLocalDate,
    nowLocalTime,
    formatLocalDateInput,
    formatLocalTimeInput,
    type FinancialPeriodMode,
} from '@/lib/financial-period';
import { FinancialPeriodFilter } from '@/components/FinancialPeriodFilter';

interface OfficeExpense {
    id: string;
    type: string;
    amount: number;
    description: string;
    expenseDate: string;
    month?: number;
    year?: number;
    paymentMethod?: string;
    createdAt: string;
}

interface PersonalExpense {
    id: string;
    amount: number;
    description: string;
    expenseDate: string;
    paymentMethod?: string;
    createdAt: string;
}

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ExpensesPage() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<OfficeExpense[]>([]);
    const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [currentMonthRent, setCurrentMonthRent] = useState<OfficeExpense | null>(null);
    const [summary, setSummary] = useState({
        totalExpenses: 0,
        officeTotal: 0,
        personalTotal: 0,
        personalCount: 0,
        dailyCount: 0,
        vehicleTotal: 0,
        rentAmount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [showRentModal, setShowRentModal] = useState(false);
    const [showPersonalModal, setShowPersonalModal] = useState(false);
    const [showDailyModal, setShowDailyModal] = useState(false);
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<(OfficeExpense | PersonalExpense) | null>(null);
    const [editingKind, setEditingKind] = useState<'office' | 'personal'>('office');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, pages: 0 });
    const [period, setPeriod] = useState<FinancialPeriodMode>('month');
    const [date, setDate] = useState(todayLocalDate);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [periodLabel, setPeriodLabel] = useState('');

    const resolvedLabel = useMemo(
        () => resolveFinancialPeriod({ period, date, month, year }).label,
        [period, date, month, year]
    );

    useEffect(() => {
        setPagination((p) => ({ ...p, page: 1 }));
    }, [period, date, month, year]);

    useEffect(() => {
        fetchData();
    }, [pagination.page, period, date, month, year]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const periodQuery = buildFinancialPeriodQuery({ period, date, month, year });
            const res = await fetch(
                `/api/financial/expenses?page=${pagination.page}&limit=${pagination.limit}&${periodQuery}`
            );
            if (res.ok) {
                const data = await res.json();
                setExpenses(data.expenses || []);
                setPersonalExpenses(data.personalExpenses || []);
                setCurrentMonthRent(data.currentMonthRent);
                setChartData(data.chartData || []);
                setSummary(data.summary || {
                    totalExpenses: 0,
                    officeTotal: 0,
                    personalTotal: 0,
                    personalCount: 0,
                    dailyCount: 0,
                    vehicleTotal: 0,
                    rentAmount: 0,
                });
                setPeriodLabel(data.label || resolvedLabel);
                if (data.pagination) setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };
    const handleCreateExpense = async (formData: any) => {
        try {
            setSubmitting(true);
            setError(null);
            const isPersonal = formData.type === 'PERSONAL';
            const res = await fetch(
                isPersonal ? '/api/financial/personal-expenses' : '/api/financial/expenses',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(
                        isPersonal
                            ? {
                                amount: formData.amount,
                                description: formData.description,
                                expenseDate: formData.expenseDate,
                                paymentMethod: formData.paymentMethod,
                            }
                            : formData
                    ),
                }
            );
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create expense');
            }
            setShowRentModal(false);
            setShowPersonalModal(false);
            setShowDailyModal(false);
            setShowVehicleModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    const handleUpdateExpense = async (id: string, formData: any) => {
        try {
            setSubmitting(true);
            setError(null);
            const endpoint =
                editingKind === 'personal'
                    ? `/api/financial/personal-expenses/${id}`
                    : `/api/financial/expenses/${id}`;
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update expense');
            }
            setShowEditModal(false);
            setEditingExpense(null);
            setEditingKind('office');
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    const handleDeleteExpense = async (id: string, kind: 'office' | 'personal' = 'office') => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            const endpoint =
                kind === 'personal'
                    ? `/api/financial/personal-expenses/${id}`
                    : `/api/financial/expenses/${id}`;
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
    const rentExpenses = expenses.filter(e => e.type === 'RENT');
    const dailyExpenses = expenses.filter(e => e.type === 'DAILY');
    const vehicleExpenses = expenses.filter(e => e.type === 'VEHICLE');
    const displayLabel = periodLabel || resolvedLabel;
    const rentPaidInPeriod = summary.rentAmount > 0;
    return (
        <div className="space-y-6 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push('/financial')} className="flex items-center justify-center h-9 w-9 p-0 shrink-0" aria-label="Back">
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <BuildingOfficeIcon className="w-7 h-7 mr-2 text-rose-600" /> Expenses
                        </h1>
                        <p className="text-sm text-gray-600">Manage office rent and daily expenses</p>
                    </div>
                </div>
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
            </div>
            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-500 to-orange-500">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-rose-100">Total Expenses</p>
                        <p className="text-2xl font-bold text-white">
                            {loading ? '…' : formatCurrency(summary.totalExpenses)}
                        </p>
                        <p className="text-[10px] text-rose-200 mt-1 truncate">{displayLabel}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-amber-100">Rent in Period</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-white">
                                {loading
                                    ? '…'
                                    : rentPaidInPeriod
                                        ? formatCurrency(summary.rentAmount)
                                        : 'Not Paid'}
                            </p>
                            {!loading && (rentPaidInPeriod ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-300" />
                            ) : (
                                <XCircleIcon className="w-6 h-6 text-red-300" />
                            ))}
                        </div>
                        <p className="text-[10px] text-amber-200 mt-1 truncate">
                            Calendar month: {currentMonthRent ? 'Paid' : 'Unpaid'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-violet-100">Personal Expenses</p>
                        <p className="text-2xl font-bold text-white">
                            {loading ? '…' : formatCurrency(summary.personalTotal || 0)}
                        </p>
                        <p className="text-[10px] text-violet-200 mt-1 truncate">
                            {summary.personalCount || 0} record{(summary.personalCount || 0) === 1 ? '' : 's'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-blue-100">Daily Expenses Count</p>
                        <p className="text-2xl font-bold text-white">
                            {loading ? '…' : summary.dailyCount}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-500 to-teal-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-teal-100">Vehicle Expenses</p>
                        <p className="text-2xl font-bold text-white">
                            {loading ? '…' : formatCurrency(summary.vehicleTotal)}
                        </p>
                    </CardContent>
                </Card>
            </div>
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button onClick={() => setShowRentModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm whitespace-nowrap" size="sm">
                    <PlusIcon className="w-4 h-4 mr-1.5" /> Rent
                </Button>
                <Button onClick={() => setShowPersonalModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm whitespace-nowrap" size="sm">
                    <PlusIcon className="w-4 h-4 mr-1.5" /> Personal
                </Button>
                <Button onClick={() => setShowDailyModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm whitespace-nowrap" size="sm">
                    <PlusIcon className="w-4 h-4 mr-1.5" /> Office
                </Button>
                <Button onClick={() => setShowVehicleModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm whitespace-nowrap" size="sm">
                    <PlusIcon className="w-4 h-4 mr-1.5" /> Vehicle
                </Button>
            </div>
            {/* Office Rent Section */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Office Rent</CardTitle>
                    <CardDescription>Monthly office rent payments — {displayLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                    {rentExpenses.length === 0 ? (
                        <div className="py-6 text-center text-gray-500">No rent payments recorded yet</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[500px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Month</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold">Method</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="font-semibold">Paid Date</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rentExpenses.map((exp) => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="font-medium">
                                                {exp.month && exp.year ? `${monthNames[(exp.month || 1) - 1]} ${exp.year}` : formatDate(exp.expenseDate)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-amber-700">{formatCurrency(Number(exp.amount))}</TableCell>
                                            <TableCell className="text-gray-700">{formatPaymentMethodLabel(exp.paymentMethod)}</TableCell>
                                            <TableCell className="text-gray-600">{exp.description}</TableCell>
                                            <TableCell className="text-gray-600" suppressHydrationWarning>{formatDate(exp.expenseDate)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingKind('office'); setEditingExpense(exp); setShowEditModal(true); }}>
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id, 'office')} className="text-red-600 hover:text-red-800">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Personal Expenses Section */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-violet-600" />
                        Personal Expenses
                    </CardTitle>
                    <CardDescription>
                        Your own spend (not office operations) — recorded to the selected wallet — {displayLabel}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-gray-500">Loading...</div>
                    ) : personalExpenses.length === 0 ? (
                        <div className="py-6 text-center text-gray-500">No personal expenses recorded</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[500px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="font-semibold">Method</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {personalExpenses.map((exp) => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="font-medium" suppressHydrationWarning>{formatDate(exp.expenseDate)}</TableCell>
                                            <TableCell className="text-gray-700">{exp.description}</TableCell>
                                            <TableCell className="text-gray-700">{formatPaymentMethodLabel(exp.paymentMethod)}</TableCell>
                                            <TableCell className="text-right font-bold text-violet-700">{formatCurrency(Number(exp.amount))}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingKind('personal'); setEditingExpense(exp); setShowEditModal(true); }}>
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id, 'personal')} className="text-red-600 hover:text-red-800">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Daily Expenses Section */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Daily Office Expenses</CardTitle>
                    <CardDescription>Day-to-day office operational costs — {displayLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-gray-500">Loading...</div>
                    ) : dailyExpenses.length === 0 ? (
                        <div className="py-6 text-center text-gray-500">No daily expenses recorded</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[500px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="font-semibold">Method</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dailyExpenses.map((exp) => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="font-medium" suppressHydrationWarning>{formatDate(exp.expenseDate)}</TableCell>
                                            <TableCell className="text-gray-700">{exp.description}</TableCell>
                                            <TableCell className="text-gray-700">{formatPaymentMethodLabel(exp.paymentMethod)}</TableCell>
                                            <TableCell className="text-right font-bold text-blue-700">{formatCurrency(Number(exp.amount))}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingKind('office'); setEditingExpense(exp); setShowEditModal(true); }}>
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id, 'office')} className="text-red-600 hover:text-red-800">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Vehicle Expenses Section */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><TruckIcon className="w-5 h-5 mr-2 text-teal-600" />Vehicle Expenses</CardTitle>
                    <CardDescription>Daily vehicle operational costs — {displayLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-gray-500">Loading...</div>
                    ) : vehicleExpenses.length === 0 ? (
                        <div className="py-6 text-center text-gray-500">No vehicle expenses recorded</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[500px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="font-semibold">Method</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vehicleExpenses.map((exp) => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="font-medium" suppressHydrationWarning>{formatDate(exp.expenseDate)}</TableCell>
                                            <TableCell className="text-gray-700">{exp.description}</TableCell>
                                            <TableCell className="text-gray-700">{formatPaymentMethodLabel(exp.paymentMethod)}</TableCell>
                                            <TableCell className="text-right font-bold text-teal-700">{formatCurrency(Number(exp.amount))}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingKind('office'); setEditingExpense(exp); setShowEditModal(true); }}>
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id, 'office')} className="text-red-600 hover:text-red-800">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={pagination.page === pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</Button>
                    </div>
                </div>
            )}
            {/* Monthly Chart */}
            {chartData.length > 0 && (
                <Card className="border shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold">Expenses Trend</CardTitle>
                        <CardDescription className="text-xs">
                            {chartDescriptionForPeriod(period)} — Daily vs Personal vs Rent vs Vehicle
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => formatCurrency(value)} />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="daily" name="Daily Expenses" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="personal" name="Personal Expenses" stackId="a" fill="#7c3aed" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="vehicle" name="Vehicle Expenses" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="rent" name="Office Rent" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Record Rent Modal */}
            {showRentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Record Office Rent</h2>
                                <p className="text-[10px] text-gray-500 font-medium">Add monthly operational rent payment</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setShowRentModal(false); setError(null); }} className="h-8 w-8 p-0 rounded-full">
                                <span className="text-xl">×</span>
                            </Button>
                        </div>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target as HTMLFormElement);
                            const expenseDateStr = String(fd.get('date') || todayLocalDate());
                            const expenseTimeStr = String(fd.get('time') || nowLocalTime());
                            const [yStr, mStr] = expenseDateStr.split('-');
                            const rentYear = parseInt(yStr, 10) || new Date().getFullYear();
                            const rentMonth = parseInt(mStr, 10) || (new Date().getMonth() + 1);
                            handleCreateExpense({
                                type: 'RENT',
                                amount: fd.get('amount'),
                                description: fd.get('description') || `Office Rent - ${monthNames[rentMonth - 1]} ${rentYear}`,
                                expenseDate: combineLocalDateAndTime(expenseDateStr, expenseTimeStr).toISOString(),
                                month: rentMonth,
                                year: rentYear,
                                paymentMethod: fd.get('paymentMethod') || 'CASH',
                            });
                        }} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Expense Date</label>
                                    <Input name="date" type="date" defaultValue={todayLocalDate()} required className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Time</label>
                                    <Input name="time" type="time" defaultValue={nowLocalTime()} required className="h-9" />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" placeholder="Enter rent amount" step="1" required className="h-9 font-bold text-amber-700" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Payment Method</label>
                                <CustomSelect
                                    name="paymentMethod"
                                    defaultValue="CASH"
                                    options={[...PAYMENT_METHOD_OPTIONS]}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Description</label>
                                <Input name="description" type="text" placeholder="Office Rent" defaultValue="Office Rent" className="h-9" />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { setShowRentModal(false); setError(null); }} className="h-9 text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white h-9 px-6 text-xs font-bold shadow-md shadow-amber-200">
                                    {submitting ? 'Saving...' : 'Record Rent'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Add Personal Expense Modal */}
            {showPersonalModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Add Personal Expense</h2>
                                <p className="text-[10px] text-gray-500 font-medium">Your own spend — deducted from the selected wallet</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setShowPersonalModal(false); setError(null); }} className="h-8 w-8 p-0 rounded-full">
                                <span className="text-xl">×</span>
                            </Button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target as HTMLFormElement);
                            handleCreateExpense({
                                type: 'PERSONAL',
                                amount: fd.get('amount'),
                                description: fd.get('description'),
                                expenseDate: combineLocalDateAndTime(
                                    String(fd.get('date') || todayLocalDate()),
                                    String(fd.get('time') || nowLocalTime())
                                ).toISOString(),
                                paymentMethod: fd.get('paymentMethod') || 'CASH',
                            });
                        }} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Expense Date</label>
                                    <Input name="date" type="date" defaultValue={todayLocalDate()} required className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Time</label>
                                    <Input name="time" type="time" defaultValue={nowLocalTime()} required className="h-9" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" placeholder="Enter amount" step="1" required className="h-9 font-bold text-violet-700" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Payment Method / Wallet</label>
                                <CustomSelect
                                    name="paymentMethod"
                                    defaultValue="CASH"
                                    options={[...PAYMENT_METHOD_OPTIONS]}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Description</label>
                                <Input name="description" type="text" placeholder="e.g. Fuel for personal car" required className="h-9" />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { setShowPersonalModal(false); setError(null); }} className="h-9 text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700 text-white h-9 px-6 text-xs font-bold shadow-md shadow-violet-200">
                                    {submitting ? 'Saving...' : 'Record Personal'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Add Daily Expense Modal */}
            {showDailyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Add Daily Expense</h2>
                                <p className="text-[10px] text-gray-500 font-medium">Record day-to-day operational cost</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setShowDailyModal(false); setError(null); }} className="h-8 w-8 p-0 rounded-full">
                                <span className="text-xl">×</span>
                            </Button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target as HTMLFormElement);
                            handleCreateExpense({
                                type: 'DAILY',
                                amount: fd.get('amount'),
                                description: fd.get('description'),
                                expenseDate: combineLocalDateAndTime(
                                    String(fd.get('date') || todayLocalDate()),
                                    String(fd.get('time') || nowLocalTime())
                                ).toISOString(),
                                paymentMethod: fd.get('paymentMethod') || 'CASH',
                            });
                        }} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Expense Date</label>
                                    <Input name="date" type="date" defaultValue={todayLocalDate()} required className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Time</label>
                                    <Input name="time" type="time" defaultValue={nowLocalTime()} required className="h-9" />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" placeholder="Enter amount" step="1" required className="h-9 font-bold text-blue-700" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Payment Method</label>
                                <CustomSelect
                                    name="paymentMethod"
                                    defaultValue="CASH"
                                    options={[...PAYMENT_METHOD_OPTIONS]}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Description / Purpose</label>
                                <Input name="description" type="text" placeholder="e.g., Tea, Stationery, etc." required className="h-9" />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { setShowDailyModal(false); setError(null); }} className="h-9 text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 text-xs font-bold shadow-md shadow-blue-200">
                                    {submitting ? 'Saving...' : 'Add Expense'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Add Vehicle Expense Modal */}
            {showVehicleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Add Vehicle Expense</h2>
                                <p className="text-[10px] text-gray-500 font-medium">Record daily vehicle operational cost</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setShowVehicleModal(false); setError(null); }} className="h-8 w-8 p-0 rounded-full">
                                <span className="text-xl">×</span>
                            </Button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target as HTMLFormElement);
                            handleCreateExpense({
                                type: 'VEHICLE',
                                amount: fd.get('amount'),
                                description: fd.get('description'),
                                expenseDate: combineLocalDateAndTime(
                                    String(fd.get('date') || todayLocalDate()),
                                    String(fd.get('time') || nowLocalTime())
                                ).toISOString(),
                                paymentMethod: fd.get('paymentMethod') || 'CASH',
                            });
                        }} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Expense Date</label>
                                    <Input name="date" type="date" defaultValue={todayLocalDate()} required className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Time</label>
                                    <Input name="time" type="time" defaultValue={nowLocalTime()} required className="h-9" />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" placeholder="Enter amount" step="1" required className="h-9 font-bold text-teal-700" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Payment Method</label>
                                <CustomSelect
                                    name="paymentMethod"
                                    defaultValue="CASH"
                                    options={[...PAYMENT_METHOD_OPTIONS]}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Description / Purpose</label>
                                <Input name="description" type="text" placeholder="e.g., Fuel, Tyre, Oil change" required className="h-9" />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { setShowVehicleModal(false); setError(null); }} className="h-9 text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-6 text-xs font-bold shadow-md shadow-teal-200">
                                    {submitting ? 'Saving...' : 'Add Expense'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Expense Modal */}
            {showEditModal && editingExpense && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingKind === 'personal' ? 'Edit Personal Expense' : 'Edit Expense'}
                                </h2>
                                <p className="text-[10px] text-gray-500 font-medium">
                                    {editingKind === 'personal'
                                        ? 'Update personal spend (wallet debit)'
                                        : 'Update previously recorded expense'}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setShowEditModal(false); setEditingExpense(null); setError(null); }} className="h-8 w-8 p-0 rounded-full">
                                <span className="text-xl">×</span>
                            </Button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target as HTMLFormElement);
                            handleUpdateExpense(editingExpense.id, {
                                amount: fd.get('amount'),
                                description: fd.get('description'),
                                expenseDate: combineLocalDateAndTime(
                                    String(fd.get('date') || formatLocalDateInput(editingExpense.expenseDate)),
                                    String(fd.get('time') || formatLocalTimeInput(editingExpense.expenseDate))
                                ).toISOString(),
                                paymentMethod: fd.get('paymentMethod') || editingExpense.paymentMethod || 'CASH',
                            });
                        }} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Date</label>
                                    <Input name="date" type="date" defaultValue={formatLocalDateInput(editingExpense.expenseDate)} required className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Time</label>
                                    <Input name="time" type="time" defaultValue={formatLocalTimeInput(editingExpense.expenseDate)} required className="h-9" />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" defaultValue={Number(editingExpense.amount)} step="1" required className="h-9 font-bold text-indigo-700" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Payment Method</label>
                                <CustomSelect
                                    name="paymentMethod"
                                    defaultValue={editingExpense.paymentMethod || 'CASH'}
                                    options={[...PAYMENT_METHOD_OPTIONS]}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Description</label>
                                <Input name="description" type="text" defaultValue={editingExpense.description} required className="h-9" />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { setShowEditModal(false); setEditingExpense(null); setError(null); }} className="h-9 text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-6 text-xs font-bold shadow-md shadow-indigo-200">
                                    {submitting ? 'Saving...' : 'Update Expense'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}