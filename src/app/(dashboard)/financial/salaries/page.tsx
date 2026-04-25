'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowLeftIcon, UserGroupIcon, CalendarIcon, CheckCircleIcon,
    XCircleIcon, BanknotesIcon, TrashIcon
} from '@heroicons/react/24/outline';
import { CustomSelect } from '@/components/ui/select-custom';
interface Employee {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    isPaid: boolean;
    salaryRecord: {
        id: string;
        amount: number;
        paidDate: string;
        paymentMethod: string;
        notes: string | null;
    } | null;
}
interface SalaryHistory {
    id: string;
    employeeName: string;
    role: string;
    amount: number;
    month: number;
    year: number;
    monthLabel: string;
    paidDate: string;
    paymentMethod: string;
    notes: string | null;
}
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
export default function SalariesPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [history, setHistory] = useState<SalaryHistory[]>([]);
    const [summary, setSummary] = useState({ totalEmployees: 0, paidCount: 0, unpaidCount: 0, totalPaid: 0 });
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        fetchData();
    }, [month, year]);
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/financial/salaries?month=${month}&year=${year}`);
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.employees || []);
                setHistory(data.history || []);
                setSummary(data.summary || { totalEmployees: 0, paidCount: 0, unpaidCount: 0, totalPaid: 0 });
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };
    const handlePaySalary = async (formData: any) => {
        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch('/api/financial/salaries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, month, year }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to record salary');
            }
            setShowPayModal(false);
            setSelectedEmployee(null);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    const handleDeleteSalary = async (id: string) => {
        if (!confirm('Are you sure you want to delete this salary record?')) return;
        try {
            const res = await fetch(`/api/financial/salaries/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            SUPER_ADMIN: 'bg-red-50 text-red-700 border-red-200',
            ADMIN: 'bg-blue-50 text-blue-700 border-blue-200',
            USER: 'bg-gray-50 text-gray-700 border-gray-200',
        };
        return colors[role] || colors.USER;
    };
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
                            <UserGroupIcon className="w-7 h-7 mr-2 text-blue-600" /> Employee Salaries
                        </h1>
                        <p className="text-sm text-gray-600">Record and manage employee salary payments</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm h-10">
                    <CalendarIcon className="w-4 h-4 text-gray-400 ml-1" />
                    <CustomSelect 
                        value={month.toString()} 
                        onChange={(val) => setMonth(parseInt(val))}
                        options={monthNames.map((name, i) => ({ value: (i + 1).toString(), label: name }))}
                        className="w-[120px]"
                        buttonClassName="border-none focus:ring-0 shadow-none h-8"
                    />
                    <div className="w-[1px] h-4 bg-gray-200" />
                    <CustomSelect 
                        value={year.toString()} 
                        onChange={(val) => setYear(parseInt(val))}
                        options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => ({ value: y.toString(), label: y.toString() }))}
                        className="w-[90px]"
                        buttonClassName="border-none focus:ring-0 shadow-none h-8"
                    />
                </div>
            </div>
            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700"><XCircleIcon className="w-5 h-5" /></button>
                </div>
            )}
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-blue-100">Total Employees</p>
                        <p className="text-2xl font-bold text-white">{summary.totalEmployees}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-emerald-100">Paid</p>
                        <p className="text-2xl font-bold text-white">{summary.paidCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-amber-100">Unpaid</p>
                        <p className="text-2xl font-bold text-white">{summary.unpaidCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-violet-100">Total Paid</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalPaid)}</p>
                    </CardContent>
                </Card>
            </div>
            {/* Employee Salary Status */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Salary Status — {monthNames[month - 1]} {year}</CardTitle>
                    <CardDescription>Click &quot;Pay Salary&quot; to record a payment</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-gray-500">Loading...</div>
                    ) : employees.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No employees found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[650px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Employee</TableHead>
                                        <TableHead className="font-semibold">Role</TableHead>
                                        <TableHead className="font-semibold text-right">Salary Amount</TableHead>
                                        <TableHead className="font-semibold text-center">Status</TableHead>
                                        <TableHead className="font-semibold">Paid Date</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.map((emp) => (
                                        <TableRow key={emp.id} className={emp.isPaid ? 'bg-emerald-50/30' : ''}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-gray-900">{emp.name}</p>
                                                    <p className="text-xs text-gray-500">{emp.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getRoleBadge(emp.role)}>
                                                    {emp.role.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {emp.isPaid ? formatCurrency(emp.salaryRecord!.amount) : '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {emp.isPaid ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                        <CheckCircleIcon className="w-3.5 h-3.5" /> Paid
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                        <XCircleIcon className="w-3.5 h-3.5" /> Unpaid
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-600" suppressHydrationWarning>
                                                {emp.isPaid && emp.salaryRecord ? formatDate(emp.salaryRecord.paidDate) : '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {emp.isPaid ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => emp.salaryRecord && handleDeleteSalary(emp.salaryRecord.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Delete salary record"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => { setSelectedEmployee(emp); setShowPayModal(true); }}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        <BanknotesIcon className="w-4 h-4 mr-1" /> Pay Salary
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Salary History */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Salary Payment History</CardTitle>
                    <CardDescription>Recent salary payments across all months</CardDescription>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <div className="py-6 text-center text-gray-500">No salary records yet</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Employee</TableHead>
                                        <TableHead className="font-semibold">Month</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold">Payment Method</TableHead>
                                        <TableHead className="font-semibold">Paid Date</TableHead>
                                        <TableHead className="font-semibold">Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-gray-900">{record.employeeName}</p>
                                                    <p className="text-xs text-gray-500">{record.role.replace('_', ' ')}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{record.monthLabel}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-700">{formatCurrency(record.amount)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{record.paymentMethod}</Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-600" suppressHydrationWarning>{formatDate(record.paidDate)}</TableCell>
                                            <TableCell className="text-gray-500 text-sm">{record.notes || '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Pay Salary Modal */}
            {showPayModal && selectedEmployee && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Pay Salary</h2>
                                <p className="text-[10px] text-gray-500 font-medium">
                                    Employee: <span className="text-blue-600 font-bold">{selectedEmployee.name}</span> — {monthNames[month - 1]} {year}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setShowPayModal(false); setSelectedEmployee(null); setError(null); }} className="h-8 w-8 p-0 rounded-full">
                                <span className="text-xl">×</span>
                            </Button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target as HTMLFormElement);
                            handlePaySalary({
                                userId: selectedEmployee.id,
                                amount: fd.get('amount'),
                                paymentMethod: fd.get('paymentMethod'),
                                notes: fd.get('notes') || null,
                            });
                        }} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Salary Amount (PKR)</label>
                                <Input name="amount" type="number" placeholder="Enter amount" step="1" required className="h-9 font-bold text-emerald-700" />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Payment Method</label>
                                <CustomSelect 
                                    name="paymentMethod" 
                                    defaultValue="CASH"
                                    options={[
                                        { value: 'CASH', label: 'Cash' },
                                        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                                        { value: 'CHECK', label: 'Check' },
                                    ]}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Notes (Optional)</label>
                                <Input name="notes" type="text" placeholder="Any notes about this payment" className="h-9" />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { setShowPayModal(false); setSelectedEmployee(null); setError(null); }} className="h-9 text-xs font-semibold">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 text-xs font-bold shadow-md shadow-blue-200">
                                    {submitting ? 'Processing...' : 'Record Payment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}