'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeftIcon, ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
interface ProfitItem {
    name: string;
    type: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
}
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
export default function ProfitPage() {
    const router = useRouter();
    const [items, setItems] = useState<ProfitItem[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    useEffect(() => {
        fetchData();
    }, [month, year]);
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/financial/profit?month=${month}&year=${year}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
                setChartData(data.chartData || []);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
    const totalCost = items.reduce((s, i) => s + i.cost, 0);
    const totalProfit = items.reduce((s, i) => s + i.profit, 0);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const cylinders = items.filter(i => i.type === 'Cylinder');
    const accessories = items.filter(i => i.type === 'Accessory');
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
                            <ChartBarIcon className="w-7 h-7 mr-2 text-violet-600" /> Profit Breakdown
                        </h1>
                        <p className="text-sm text-gray-600">Revenue, cost, and profit per product</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none cursor-pointer">
                        {monthNames.map((name, i) => (<option key={i} value={i + 1}>{name}</option>))}
                    </select>
                    <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none cursor-pointer">
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (<option key={y} value={y}>{y}</option>))}
                    </select>
                </div>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-emerald-100">Total Revenue</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-500 to-rose-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-rose-100">Total Cost</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-violet-100">Net Profit</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalProfit)}</p>
                    </CardContent>
                </Card>
            </div>
            {/* Profit Table */}
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Profit by Product</CardTitle>
                    <CardDescription>{monthNames[month - 1]} {year}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-gray-500">Loading...</div>
                    ) : items.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No sales data for this period</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[650px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Product</TableHead>
                                        <TableHead className="font-semibold">Type</TableHead>
                                        <TableHead className="font-semibold text-right">Qty</TableHead>
                                        <TableHead className="font-semibold text-right">Revenue</TableHead>
                                        <TableHead className="font-semibold text-right">Cost</TableHead>
                                        <TableHead className="font-semibold text-right">Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cylinders.length > 0 && (
                                        <>
                                            <TableRow className="bg-emerald-50/50 hover:bg-emerald-50/50">
                                                <TableCell colSpan={6} className="font-bold text-emerald-800 text-xs uppercase tracking-wider py-2">Gas Cylinders</TableCell>
                                            </TableRow>
                                            {cylinders.map((item, idx) => (
                                                <TableRow key={`cyl-${idx}`}>
                                                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Cylinder</Badge></TableCell>
                                                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-medium text-gray-700">{formatCurrency(item.revenue)}</TableCell>
                                                    <TableCell className="text-right font-medium text-rose-600">{formatCurrency(item.cost)}</TableCell>
                                                    <TableCell className="text-right font-bold text-violet-700">{formatCurrency(item.profit)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    )}
                                    {accessories.length > 0 && (
                                        <>
                                            <TableRow className="bg-purple-50/50 hover:bg-purple-50/50">
                                                <TableCell colSpan={6} className="font-bold text-purple-800 text-xs uppercase tracking-wider py-2">Accessories</TableCell>
                                            </TableRow>
                                            {accessories.map((item, idx) => (
                                                <TableRow key={`acc-${idx}`}>
                                                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">Accessory</Badge></TableCell>
                                                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-medium text-gray-700">{formatCurrency(item.revenue)}</TableCell>
                                                    <TableCell className="text-right font-medium text-rose-600">{formatCurrency(item.cost)}</TableCell>
                                                    <TableCell className="text-right font-bold text-purple-700">{formatCurrency(item.profit)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    )}
                                    <TableRow className="border-t-2 border-gray-300 bg-gray-50">
                                        <TableCell className="font-bold text-gray-900">TOTAL</TableCell>
                                        <TableCell />
                                        <TableCell className="text-right font-bold text-gray-900">{totalQty}</TableCell>
                                        <TableCell className="text-right font-bold text-gray-700">{formatCurrency(totalRevenue)}</TableCell>
                                        <TableCell className="text-right font-bold text-rose-600">{formatCurrency(totalCost)}</TableCell>
                                        <TableCell className="text-right font-extrabold text-violet-900 text-lg">{formatCurrency(totalProfit)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Monthly Profit Chart */}
            {chartData.length > 0 && (
                <Card className="border shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold">Monthly Profit Trend</CardTitle>
                        <CardDescription className="text-xs">Estimated profit over last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => formatCurrency(value)} />
                                    <Bar dataKey="profit" name="Estimated Profit" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
