'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeftIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    PAYMENT_METHOD_OPTIONS,
    emptyPaymentMethodTotals,
    type PaymentMethodValue,
} from '@/lib/payment-methods';
import {
    buildFinancialPeriodQuery,
    chartDescriptionForPeriod,
    resolveFinancialPeriod,
    todayLocalDate,
    type FinancialPeriodMode,
} from '@/lib/financial-period';
import { FinancialPeriodFilter } from '@/components/FinancialPeriodFilter';

interface RevenueItem {
    name: string;
    type: string;
    quantity: number;
    revenue: number;
}

const PAYMENT_METHOD_CARD_STYLES: Record<
    PaymentMethodValue,
    { gradient: string; labelTone: string }
> = {
    CASH: {
        gradient: 'from-amber-500 to-amber-600',
        labelTone: 'text-amber-100',
    },
    BANK_TRANSFER: {
        gradient: 'from-indigo-500 to-indigo-600',
        labelTone: 'text-indigo-100',
    },
    EASYPAISA: {
        gradient: 'from-lime-500 to-green-600',
        labelTone: 'text-lime-100',
    },
    JAZZ_CASH: {
        gradient: 'from-rose-500 to-rose-600',
        labelTone: 'text-rose-100',
    },
};

export default function RevenuePage() {
    const router = useRouter();
    const [items, setItems] = useState<RevenueItem[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [byPaymentMethod, setByPaymentMethod] = useState<Record<PaymentMethodValue, number>>(
        emptyPaymentMethodTotals()
    );
    const [loading, setLoading] = useState(true);
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
        fetchData();
    }, [period, date, month, year]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(
                `/api/financial/revenue?${buildFinancialPeriodQuery({ period, date, month, year })}`
            );
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
                setChartData(data.chartData || []);
                setByPaymentMethod({
                    ...emptyPaymentMethodTotals(),
                    ...(data.byPaymentMethod || {}),
                });
                setPeriodLabel(data.label || resolvedLabel);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
    const cylinders = items.filter(i => i.type === 'Cylinder');
    const accessories = items.filter(i => i.type === 'Accessory');
    const displayLabel = periodLabel || resolvedLabel;

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push('/financial')} className="flex items-center justify-center h-9 w-9 p-0 shrink-0" aria-label="Back">
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <CurrencyDollarIcon className="w-7 h-7 mr-2 text-emerald-600" /> Revenue Breakdown
                        </h1>
                        <p className="text-sm text-gray-600">Products sold with quantities and revenue</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-emerald-100">Total Revenue</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-blue-100">Gas Cylinders Revenue</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(cylinders.reduce((s, i) => s + i.revenue, 0))}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-purple-100">Accessories Revenue</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(accessories.reduce((s, i) => s + i.revenue, 0))}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PAYMENT_METHOD_OPTIONS.map((method) => {
                    const styles = PAYMENT_METHOD_CARD_STYLES[method.value];
                    return (
                        <Card
                            key={method.value}
                            className={`border-0 shadow-sm bg-gradient-to-br ${styles.gradient}`}
                        >
                            <CardContent className="p-4">
                                <p className={`text-sm font-medium ${styles.labelTone}`}>{method.label}</p>
                                <p className="text-2xl font-bold text-white">
                                    {loading ? '…' : formatCurrency(byPaymentMethod[method.value] || 0)}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Products Sold</CardTitle>
                    <CardDescription>{displayLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-gray-500">Loading...</div>
                    ) : items.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No sales data for this period</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[500px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Product</TableHead>
                                        <TableHead className="font-semibold">Type</TableHead>
                                        <TableHead className="font-semibold text-right">Qty Sold</TableHead>
                                        <TableHead className="font-semibold text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cylinders.length > 0 && (
                                        <>
                                            <TableRow className="bg-emerald-50/50 hover:bg-emerald-50/50">
                                                <TableCell colSpan={4} className="font-bold text-emerald-800 text-xs uppercase tracking-wider py-2">Gas Cylinders</TableCell>
                                            </TableRow>
                                            {cylinders.map((item, idx) => (
                                                <TableRow key={`cyl-${idx}`}>
                                                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Cylinder</Badge></TableCell>
                                                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-700">{formatCurrency(item.revenue)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    )}
                                    {accessories.length > 0 && (
                                        <>
                                            <TableRow className="bg-purple-50/50 hover:bg-purple-50/50">
                                                <TableCell colSpan={4} className="font-bold text-purple-800 text-xs uppercase tracking-wider py-2">Accessories</TableCell>
                                            </TableRow>
                                            {accessories.map((item, idx) => (
                                                <TableRow key={`acc-${idx}`}>
                                                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">Accessory</Badge></TableCell>
                                                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-bold text-purple-700">{formatCurrency(item.revenue)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    )}
                                    <TableRow className="border-t-2 border-gray-300 bg-gray-50">
                                        <TableCell className="font-bold text-gray-900">TOTAL</TableCell>
                                        <TableCell />
                                        <TableCell className="text-right font-bold text-gray-900">{totalQty}</TableCell>
                                        <TableCell className="text-right font-extrabold text-gray-900 text-lg">{formatCurrency(totalRevenue)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {chartData.length > 0 && (
                <Card className="border shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold">Revenue Trend</CardTitle>
                        <CardDescription className="text-xs">
                            {chartDescriptionForPeriod(period)} — Cylinders vs Accessories
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
                                    <Bar dataKey="cylinders" name="Cylinders" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="accessories" name="Accessories" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
