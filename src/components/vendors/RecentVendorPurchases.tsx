'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingCartIcon,
  ArchiveBoxIcon,
  BoltIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  EyeIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PurchaseItem {
  id: string;
  itemName: string;
  itemDescription?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
}

interface RecentPurchase {
  id: string;
  invoiceNumber: string | null;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING';
  status: string;
  category: string;
  categoryName?: string;
  categorySlug?: string;
  notes?: string | null;
  recordedBy?: string | null;
  vendor: {
    id: string;
    companyName: string;
    vendorCode: string;
    contactPerson?: string | null;
    category?: {
      id: string;
      name: string;
      slug?: string | null;
    } | null;
  };
  items: PurchaseItem[];
  paymentCount: number;
}

const getCategoryIcon = (slug?: string | null) => {
  const normalized = (slug || '').toLowerCase().replace(/[_-]/g, '');
  if (normalized.includes('gas')) return BoltIcon;
  if (normalized.includes('cylinder')) return ArchiveBoxIcon;
  if (normalized.includes('vaporizer')) return CpuChipIcon;
  if (normalized.includes('accessories')) return WrenchScrewdriverIcon;
  if (normalized.includes('valve')) return Cog6ToothIcon;
  return ShoppingCartIcon;
};

const getCategoryColor = (slug?: string | null) => {
  const normalized = (slug || '').toLowerCase().replace(/[_-]/g, '');
  if (normalized.includes('gas')) {
    return {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'text-emerald-600',
    };
  }
  if (normalized.includes('cylinder')) {
    return {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'text-blue-600',
    };
  }
  if (normalized.includes('vaporizer')) {
    return {
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'text-purple-600',
    };
  }
  if (normalized.includes('accessories')) {
    return {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'text-amber-600',
    };
  }
  if (normalized.includes('valve')) {
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: 'text-rose-600',
    };
  }
  return {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: 'text-slate-600',
  };
};

const formatPrice = (amount: number) => {
  return `Rs ${Math.round(amount || 0).toLocaleString('en-PK')}`;
};

const formatDate = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export default function RecentVendorPurchases() {
  const [purchases, setPurchases] = useState<RecentPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<RecentPurchase | null>(null);

  const fetchRecentPurchases = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      setError(null);
      const res = await fetch('/api/vendors/recent-purchases?limit=5');
      if (!res.ok) {
        throw new Error(`Failed to load purchases (${res.status})`);
      }
      const data = await res.json();
      setPurchases(data.purchases || []);
    } catch (err: any) {
      console.error('Error fetching recent vendor purchases:', err);
      setError(err?.message || 'Unable to fetch recent purchases');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentPurchases();
  }, [fetchRecentPurchases]);

  return (
    <div className="mt-10">
      <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50/50 border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                <ShoppingCartIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">
                    Recent Vendor Purchases
                  </CardTitle>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                    Last 5 Active Purchases
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest procurement orders, itemized details, and payment statuses across all vendors
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRecentPurchases(true)}
                disabled={loading || isRefreshing}
                className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 gap-1.5 transition-all"
                title="Refresh recent purchases"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-1/3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="w-full sm:w-1/3 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                  <div className="w-full sm:w-1/4 flex justify-end">
                    <div className="h-8 bg-slate-200 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <ExclamationCircleIcon className="w-10 h-10 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 mb-1">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchRecentPurchases(true)}
                className="mt-2 text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ShoppingCartIcon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">No Purchases Recorded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Purchases recorded under any vendor category in this branch will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {purchases.map((purchase) => {
                const categorySlug = purchase.categorySlug || purchase.category;
                const CategoryIcon = getCategoryIcon(categorySlug);
                const categoryTheme = getCategoryColor(categorySlug);
                const firstItem = purchase.items[0];
                const totalItemUnits = purchase.items.reduce((s, it) => s + it.quantity, 0);

                return (
                  <div
                    key={purchase.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left: Vendor & Category Meta */}
                    <div className="flex items-start gap-3.5 lg:w-[28%] min-w-0">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${categoryTheme.bg}`}>
                        <CategoryIcon className={`w-5 h-5 ${categoryTheme.icon}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/vendors/${purchase.vendor.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-sm truncate max-w-[200px]"
                            title={purchase.vendor.companyName}
                          >
                            {purchase.vendor.companyName}
                          </Link>
                          <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {purchase.vendor.vendorCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(purchase.purchaseDate)}
                          </span>
                          {purchase.invoiceNumber && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded">
                              <DocumentTextIcon className="w-3 h-3 text-slate-400" />
                              {purchase.invoiceNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: What Was Bought (Itemized Summary) */}
                    <div className="lg:w-[42%] min-w-0 bg-slate-50/60 p-3 rounded-xl border border-slate-100/80">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <TagIcon className="w-3.5 h-3.5 text-blue-600" />
                          <span>What Was Bought:</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            ({purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}, {totalItemUnits.toLocaleString()} units)
                          </span>
                        </div>
                        {purchase.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedPurchase(purchase)}
                            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5"
                          >
                            <EyeIcon className="w-3 h-3" />
                            View All ({purchase.items.length})
                          </button>
                        )}
                      </div>

                      {/* Line Item Preview */}
                      <div className="space-y-1">
                        {purchase.items.slice(0, 2).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="text-xs text-slate-800 flex items-center justify-between gap-2 bg-white px-2 py-1 rounded border border-slate-100"
                          >
                            <span className="font-medium truncate flex-1" title={item.itemName}>
                              {item.itemName}
                              {item.itemDescription && (
                                <span className="text-[11px] font-normal text-slate-400 ml-1">
                                  ({item.itemDescription})
                                </span>
                              )}
                            </span>
                            <span className="text-slate-600 shrink-0 font-mono text-[11px]">
                              {item.quantity.toLocaleString()} × {formatPrice(item.unitPrice)}
                            </span>
                            <span className="font-semibold text-slate-900 shrink-0 font-mono text-[11px]">
                              = {formatPrice(item.totalPrice)}
                            </span>
                          </div>
                        ))}

                        {purchase.items.length > 2 && (
                          <div className="text-[11px] text-slate-500 italic pl-1">
                            + {purchase.items.length - 2} more line items...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Financial Total & Quick Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 lg:w-[26%] shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <div className="text-xs text-slate-500 font-medium">Total Amount</div>
                        <div className="text-base font-bold text-slate-900 tracking-tight">
                          {formatPrice(purchase.totalAmount)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 justify-start lg:justify-end">
                          {purchase.paymentStatus === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                              PAID
                            </span>
                          ) : purchase.paymentStatus === 'PARTIAL' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <ClockIcon className="w-3 h-3 text-amber-600" />
                              PARTIAL ({formatPrice(purchase.paidAmount)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <ClockIcon className="w-3 h-3 text-slate-400" />
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPurchase(purchase)}
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Inspect full item breakdown"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Link href={`/vendors/${purchase.vendor.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 gap-1"
                          >
                            <span>Vendor</span>
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Itemized Purchase Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Purchase Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPurchase.vendor.companyName} ({selectedPurchase.vendor.vendorCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Date & Time</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedPurchase.purchaseDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Invoice #</span>
                  <span className="font-semibold font-mono text-slate-800">{selectedPurchase.invoiceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Recorded By</span>
                  <span className="font-semibold text-slate-800">{selectedPurchase.recordedBy || 'System'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Purchased Items ({selectedPurchase.items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5 text-right">Quantity</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPurchase.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-medium text-slate-900">
                            {item.itemName}
                            {item.itemDescription && (
                              <span className="text-[11px] text-slate-400 block font-normal">
                                {item.itemDescription}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            {formatPrice(item.unitPrice)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                            {formatPrice(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right">Grand Total:</td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-600">
                          {formatPrice(selectedPurchase.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs">
                <div>
                  <span className="text-slate-600 block">Payment Status</span>
                  <span className="font-bold text-slate-900">
                    Paid: {formatPrice(selectedPurchase.paidAmount)} / Balance: {formatPrice(selectedPurchase.balanceAmount)}
                  </span>
                </div>
                <div>
                  {selectedPurchase.paymentStatus === 'PAID' ? (
                    <Badge className="bg-emerald-600 text-white">Fully Paid</Badge>
                  ) : selectedPurchase.paymentStatus === 'PARTIAL' ? (
                    <Badge className="bg-amber-600 text-white">Partially Paid</Badge>
                  ) : (
                    <Badge className="bg-slate-600 text-white">Payment Pending</Badge>
                  )}
                </div>
              </div>

              {selectedPurchase.notes && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-semibold block text-slate-700 mb-0.5">Notes:</span>
                  {selectedPurchase.notes}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <Link href={`/vendors/${selectedPurchase.vendor.id}`}>
                <Button size="sm" variant="outline" className="text-xs gap-1">
                  <span>Go to Vendor Profile</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => setSelectedPurchase(null)}
                className="text-xs px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
