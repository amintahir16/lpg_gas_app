'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowLeftIcon, BuildingOfficeIcon, PlusIcon, CalendarIcon,
    PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CustomSelect } from '@/components/ui/select-custom';
interface OfficeExpense {
    id: string;
    type: string;
    amount: number;
    description: string;
    expenseDate: string;
    month?: number;
    year?: number;
    createdAt: string;
}
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
export default function ExpensesPage() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<OfficeExpense[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [currentMonthRent, setCurrentMonthRent] = useState<OfficeExpense | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRentModal, setShowRentModal] = useState(false);
    const [showDailyModal, setShowDailyModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<OfficeExpense | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    useEffect(() => {
        fetchData();
    }, [pagination.page]);
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/financial/expenses?page=${pagination.page}&limit=${pagination.limit}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data.expenses || []);
                setCurrentMonthRent(data.currentMonthRent);
                setChartData(data.chartData || []);
                setPagination(data.pagination);
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
            const res = await fetch('/api/financial/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create expense');
            }
            setShowRentModal(false);
            setShowDailyModal(false);
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
            const res = await fetch(`/api/financial/expenses/${id}`, {
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
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            const res = await fetch(`/api/financial/expenses/${id}`, { method: 'DELETE' });
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
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const now = new Date();
    return (
        <div className="space-y-6 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push('/financial')} className="h-9">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <BuildingOfficeIcon className="w-7 h-7 mr-2 text-rose-600" /> Office Expenses
                        </h1>
                        <p className="text-sm text-gray-600">Manage office rent and daily expenses</p>
                    </div>
                </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-500 to-orange-500">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-rose-100">Total Expenses (All Time)</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-amber-100">Current Month Rent</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-white">
                                {currentMonthRent ? formatCurrency(Number(currentMonthRent.amount)) : 'Not Paid'}
                            </p>
                            {currentMonthRent ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-300" />
                            ) : (
                                <XCircleIcon className="w-6 h-6 text-red-300" />
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-blue-100">Daily Expenses Count</p>
                        <p className="text-2xl font-bold text-white">{dailyExpenses.length}</p>
                    </CardContent>
                </Card>
            </div>
            {/* Office Rent Section */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Office Rent</CardTitle>
                        <CardDescription>Monthly office rent payments</CardDescription>
                    </div>
                    <Button onClick={() => setShowRentModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white" size="sm">
                        <PlusIcon className="w-4 h-4 mr-2" /> Record Rent
                    </Button>
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
                                            <TableCell className="text-gray-600">{exp.description}</TableCell>
                                            <TableCell className="text-gray-600" suppressHydrationWarning>{formatDate(exp.expenseDate)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingExpense(exp); setShowEditModal(true); }}>
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id)} className="text-red-600 hover:text-red-800">
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
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Daily Office Expenses</CardTitle>
                        <CardDescription>Day-to-day office operational costs</CardDescription>
                    </div>
                    <Button onClick={() => setShowDailyModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                        <PlusIcon className="w-4 h-4 mr-2" /> Add Expense
                    </Button>
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
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dailyExpenses.map((exp) => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="font-medium" suppressHydrationWarning>{formatDate(exp.expenseDate)}</TableCell>
                                            <TableCell className="text-gray-700">{exp.description}</TableCell>
                                            <TableCell className="text-right font-bold text-blue-700">{formatCurrency(Number(exp.amount))}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingExpense(exp); setShowEditModal(true); }}>
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id)} className="text-red-600 hover:text-red-800">
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
                        <CardTitle className="text-base font-bold">Monthly Expenses Trend</CardTitle>
                        <CardDescription className="text-xs">Last 6 months — Daily Expenses vs Rent</CardDescription>
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
                            const rentMonth = parseInt(fd.get('month') as string);
                            const rentYear = parseInt(fd.get('year') as string);
                            handleCreateExpense({
                                type: 'RENT',
                                amount: fd.get('amount'),
                                description: fd.get('description') || `Office Rent - ${monthNames[rentMonth - 1]} ${rentYear}`,
                                expenseDate: new Date(rentYear, rentMonth - 1, 15).toISOString(),
                                month: rentMonth,
                                year: rentYear,
                            });
                        }} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Month</label>
                                    <CustomSelect 
                                        name="month" 
                                        defaultValue={(now.getMonth() + 1).toString()}
                                        options={monthNames.map((name, i) => ({ value: (i + 1).toString(), label: name }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Year</label>
                                    <CustomSelect 
                                        name="year" 
                                        defaultValue={now.getFullYear().toString()}
                                        options={Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => ({ value: y.toString(), label: y.toString() }))}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" placeholder="Enter rent amount" step="1" required className="h-9 font-bold text-amber-700" />
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
                                expenseDate: fd.get('date'),
                            });
                        }} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Expense Date</label>
                                <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="h-9" />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" placeholder="Enter amount" step="1" required className="h-9 font-bold text-blue-700" />
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
            {/* Edit Expense Modal */}
            {showEditModal && editingExpense && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Edit Expense</h2>
                                <p className="text-[10px] text-gray-500 font-medium">Update previously recorded expense</p>
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
                                expenseDate: fd.get('date'),
                            });
                        }} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Date</label>
                                <Input name="date" type="date" defaultValue={new Date(editingExpense.expenseDate).toISOString().split('T')[0]} required className="h-9" />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Amount (PKR)</label>
                                <Input name="amount" type="number" defaultValue={Number(editingExpense.amount)} step="1" required className="h-9 font-bold text-indigo-700" />
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