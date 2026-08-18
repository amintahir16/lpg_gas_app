import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

/** Page Header Skeleton */
export function PageHeaderSkeleton({ hasAction = true }: { hasAction?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:w-64" />
        <Skeleton className="h-4 w-72 sm:w-96" />
      </div>
      {hasAction && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      )}
    </div>
  );
}

/** Stat Cards Skeleton (1 to 4 cards) */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  const gridClass =
    count === 1
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : count === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : count === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid gap-4 sm:gap-6 ${gridClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-slate-100 shadow-xs overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Table Skeleton */
export function TableSkeleton({
  rows = 5,
  cols = 5,
  hasSearch = true,
}: {
  rows?: number;
  cols?: number;
  hasSearch?: boolean;
}) {
  return (
    <div className="space-y-4">
      {hasSearch && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Table Header */}
        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-4 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-20' : 'w-24'}`}
            />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={r}
              className="px-4 py-3.5 flex items-center justify-between gap-4"
            >
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton
                  key={c}
                  className={`h-4 ${
                    c === 0
                      ? 'w-36'
                      : c === cols - 1
                        ? 'w-16'
                        : c % 2 === 0
                          ? 'w-20'
                          : 'w-28'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Table Footer / Pagination */}
        <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wallets Grid Skeleton */
export function WalletsGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
        <Skeleton className="h-4 w-44" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm rounded-2xl overflow-hidden bg-slate-100">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 bg-slate-200" />
                <Skeleton className="h-7 w-16 rounded-full bg-slate-200" />
              </div>
              <Skeleton className="h-8 w-32 bg-slate-200" />
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <Skeleton className="h-3 w-20 bg-slate-200" />
                <Skeleton className="h-3 w-4 bg-slate-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Vendor Detail Skeleton */
export function VendorDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3 Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-7 w-36" />
              </div>
              <Skeleton className="w-10 h-10 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Table Content */}
      <TableSkeleton rows={5} cols={6} />
    </div>
  );
}

/** Customer Detail Skeleton */
export function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-44" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ledger Table Skeleton */}
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}

/** Reports Page Skeleton */
export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}

/** Main Dashboard Skeleton */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <StatCardsSkeleton count={4} />

      {/* 2 Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <TableSkeleton rows={5} cols={6} />
    </div>
  );
}

/** Full Dashboard Layout Auth Skeleton */
export function LayoutAuthSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:flex flex-col w-64 bg-white/95 border-r border-gray-200 p-4 space-y-4">
        <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg mt-2" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 w-full bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
      {/* Content Area Skeleton */}
      <div className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-14 w-full bg-white/80 rounded-lg shadow-xs px-4 flex items-center justify-between border border-gray-100">
          <div className="h-5 w-40 bg-slate-200 animate-pulse rounded" />
          <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-full" />
        </div>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-slate-200 animate-pulse rounded" />
            <div className="h-4 w-72 bg-slate-200 animate-pulse rounded" />
          </div>
          <StatCardsSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}

/** Settings Page Skeleton */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* 2-column card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-56" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial & Operational */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-56" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance & Safety */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Statistics */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Pricing Management Skeleton */
export function PricingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
      </div>

      {/* Plant Price Setting Card */}
      <Card className="border border-slate-200 shadow-xs bg-white">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-64" />
            </div>
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Margin Categories Sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Site Settings Skeleton */
export function SiteSettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="space-y-6">
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <div className="space-y-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Website Inquiries Skeleton */
export function WebsiteInquiriesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>

      <TableSkeleton rows={5} cols={5} hasSearch={false} />
    </div>
  );
}



