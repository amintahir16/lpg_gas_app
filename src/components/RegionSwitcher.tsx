'use client';

import { Fragment, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Listbox, Transition } from '@headlessui/react';
import {
  BuildingOffice2Icon,
  ChevronDownIcon,
  CheckIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface RegionOption {
  id: string;
  name: string;
  code?: string | null;
  isDefault?: boolean;
}

/**
 * Compact region indicator + switcher used in the dashboard top bar.
 *
 * Behaviour:
 * - SUPER_ADMIN              → dropdown of all active regions, switch instantly.
 * - ADMIN with > 1 branch    → dropdown of their assigned branches.
 * - ADMIN with a single branch → read-only badge (nothing to switch to).
 * - other roles              → renders nothing.
 */
export function RegionSwitcher() {
  const { data: session } = useSession();

  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const role = session?.user?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    if (!session?.user) return;
    if (!isSuperAdmin && !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/select-region', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setRegions(data.regions || []);
        if (data.activeRegionId && (data.regions || []).some((r: RegionOption) => r.id === data.activeRegionId)) {
          setActiveRegionId(data.activeRegionId);
        } else if (data.assignedRegionId) {
          setActiveRegionId(data.assignedRegionId);
        } else if ((data.regions || []).length > 0) {
          setActiveRegionId(data.regions[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user, isSuperAdmin, isAdmin]);

  if (!session?.user) return null;
  if (!isSuperAdmin && !isAdmin) return null;
  if (loading || regions.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-500 px-2 sm:px-3 py-1.5 rounded-md border border-gray-200 bg-white/70 max-w-[55vw] sm:max-w-none">
        <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="truncate">Loading branch…</span>
      </div>
    );
  }

  const active = regions.find((r) => r.id === activeRegionId) || regions[0];

  // Single-branch ADMINs cannot switch — render a static badge so they still
  // have visual confirmation of their context.
  if (isAdmin && regions.length <= 1) {
    return (
      <div
        className="inline-flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-700 px-2 sm:px-3 py-1.5 rounded-md border border-gray-200 bg-white shadow-sm max-w-[55vw] sm:max-w-none min-w-0"
        title="You are locked to this branch. Contact a Super Admin to change it."
      >
        <BuildingOffice2Icon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        <span className="truncate max-w-[110px] sm:max-w-[160px]">{active.name}</span>
        {active.code && (
          <span className="hidden sm:inline text-gray-400 font-mono">· {active.code}</span>
        )}
      </div>
    );
  }

  const handleSwitch = async (regionId: string) => {
    if (regionId === active.id) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/select-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId }),
      });
      if (res.ok) {
        setActiveRegionId(regionId);
        // A full reload is intentional here — dashboards, lists, and detail
        // pages fetch their data client-side via useEffect, which won't re-run
        // on a soft `router.refresh()`. Reloading guarantees every page picks
        // up the new region cookie and refetches with it.
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        setSwitching(false);
      }
    } catch {
      setSwitching(false);
    }
  };

  return (
    <Listbox value={active.id} onChange={handleSwitch} disabled={switching}>
      <div className="relative">
        <Listbox.Button
          className={cn(
            'inline-flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium px-2 sm:px-3 py-1.5 rounded-md border bg-white shadow-sm hover:bg-gray-50 transition-colors max-w-[55vw] sm:max-w-none min-w-0',
            switching ? 'opacity-70 cursor-wait' : 'cursor-pointer',
            'border-gray-200 text-gray-700'
          )}
        >
          <BuildingOffice2Icon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span className="truncate max-w-[100px] sm:max-w-[140px]">{active.name}</span>
          {active.isDefault && (
            <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold flex-shrink-0">
              Default
            </span>
          )}
          <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute right-0 z-50 mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-[18rem] max-h-72 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-400 font-semibold border-b border-gray-100 flex items-center gap-1.5">
              <ArrowsRightLeftIcon className="w-3 h-3" />
              Switch active branch
            </div>
            {regions.map((region) => (
              <Listbox.Option
                key={region.id}
                value={region.id}
                className={({ active: isActive }) =>
                  cn(
                    'relative select-none py-2 pl-9 pr-3 text-sm cursor-pointer',
                    isActive ? 'bg-blue-50 text-blue-900' : 'text-gray-800'
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className={cn('block truncate', selected ? 'font-semibold' : 'font-normal')}>
                      {region.name}
                    </span>
                    {region.code && (
                      <span className="block text-[10px] text-gray-400 font-mono">
                        {region.code}
                      </span>
                    )}
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-blue-600">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
