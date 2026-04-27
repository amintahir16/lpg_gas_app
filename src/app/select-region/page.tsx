'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FlamoraAnimatedLogo from '@/components/ui/FlamoraAnimatedLogo';
import { cn } from '@/lib/utils';

interface RegionOption {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  isDefault?: boolean;
}

function SelectRegionInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [assignedRegionId, setAssignedRegionId] = useState<string | null>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/select-region', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || 'Failed to load regions');
        }
        const data = await res.json();
        if (cancelled) return;
        setRegions(data.regions || []);
        setAssignedRegionId(data.assignedRegionId || null);
        setRole(data.role || '');
        if (data.message) setInfo(data.message);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const handleSelect = async (regionId: string) => {
    setError('');
    setSubmitting(regionId);
    try {
      const res = await fetch('/api/select-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to select region');
      router.replace(callbackUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setSubmitting(null);
    }
  };

  const isMultiRegionAdmin = !isSuperAdmin && regions.length > 1;

  const headline = useMemo(() => {
    if (isSuperAdmin) return 'Choose a Branch to Operate';
    if (isMultiRegionAdmin) return 'Choose Your Active Branch';
    return 'Welcome Back';
  }, [isSuperAdmin, isMultiRegionAdmin]);

  const subline = useMemo(() => {
    if (isSuperAdmin) {
      return 'Pick the branch whose data you want to view and edit. You can switch later from the sidebar.';
    }
    if (isMultiRegionAdmin) {
      return 'You have access to multiple branches. Pick the one you want to work in — you can switch from the top bar later.';
    }
    return 'Continue into your assigned branch.';
  }, [isSuperAdmin, isMultiRegionAdmin]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading branches…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <FlamoraAnimatedLogo className="w-64 sm:w-72" />
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Signed in as {session?.user?.name || session?.user?.email} ·{' '}
            <span className="capitalize">{role.toLowerCase().replace('_', ' ') || 'admin'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            {headline}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">{subline}</p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {info && (
          <div className="max-w-2xl mx-auto flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-700">{info}</p>
          </div>
        )}

        {regions.length === 0 ? (
          <Card className="max-w-2xl mx-auto shadow-md border-0 bg-white/85 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">No branches available</CardTitle>
              <CardDescription>
                {isSuperAdmin
                  ? 'No active regions exist yet. Create one from the Regions page.'
                  : 'Your account is not assigned to any branch yet. Please contact a Super Administrator.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              {isSuperAdmin && (
                <Button
                  onClick={() => router.push('/admin/regions')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Manage Regions
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {regions.map((region) => {
              const isAssigned = assignedRegionId === region.id;
              const isLoading = submitting === region.id;
              return (
                <Card
                  key={region.id}
                  className={cn(
                    'group relative shadow-sm border bg-white/90 backdrop-blur-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden',
                    'w-full max-w-sm sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]',
                    isAssigned ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200 hover:border-blue-200'
                  )}
                  onClick={() => !isLoading && handleSelect(region.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
                          <BuildingOffice2Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">
                            {region.name}
                          </CardTitle>
                          {region.code && (
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {region.code}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {region.isDefault && (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[10px] px-2 py-0 h-5">
                            Default
                          </Badge>
                        )}
                        {isAssigned && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-2 py-0 h-5">
                            Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {region.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{region.description}</p>
                    )}
                    {region.address && (
                      <div className="flex items-start gap-2 text-xs text-gray-600">
                        <MapPinIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{region.address}</span>
                      </div>
                    )}
                    {region.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <PhoneIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>{region.phone}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className={cn(
                        'w-full mt-3 h-9 transition-all',
                        isAssigned
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-blue-700 text-white'
                      )}
                      disabled={isLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(region.id);
                      }}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Entering…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4" />
                          Continue to {region.name}
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gray-500 hover:text-gray-800"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SelectRegionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading…</p>
          </div>
        </div>
      }
    >
      <SelectRegionInner />
    </Suspense>
  );
}
