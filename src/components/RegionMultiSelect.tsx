'use client';

import { Fragment, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import {
    BuildingOffice2Icon,
    ChevronUpDownIcon,
    CheckIcon,
    StarIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

export interface RegionOption {
    id: string;
    name: string;
    code?: string | null;
    isActive?: boolean;
}

interface Props {
    /**
     * Ordered list of selected region ids. The FIRST id is treated as the
     * primary / default branch (auto-selected on login when the admin has only
     * one branch). Re-ordering this array re-assigns primary.
     */
    value: string[];
    onChange: (ids: string[]) => void;
    options: RegionOption[];
    placeholder?: string;
    /** Hide the "Make primary" affordance; useful for the create flow when
     *  primary is implicitly the first picked option. */
    showPrimaryControl?: boolean;
    disabled?: boolean;
    id?: string;
}

/**
 * Multi-branch picker used by SUPER_ADMINs to assign one or more regions to an
 * admin. Selected branches render as chips below the trigger; the first chip
 * is the PRIMARY (badged with a filled star). Clicking a non-primary chip's
 * star promotes it to primary by re-ordering the array.
 */
export default function RegionMultiSelect({
    value,
    onChange,
    options,
    placeholder = 'Select branches…',
    showPrimaryControl = true,
    disabled = false,
    id,
}: Props) {
    const selectedSet = useMemo(() => new Set(value), [value]);
    const optionMap = useMemo(() => {
        const m = new Map<string, RegionOption>();
        for (const o of options) m.set(o.id, o);
        return m;
    }, [options]);

    // Render selected chips in the user's chosen order so the primary is
    // visually fixed at the top-left even after toggling other branches.
    const orderedSelected = value
        .map((rid) => optionMap.get(rid))
        .filter((o): o is RegionOption => Boolean(o));

    const toggle = (rid: string) => {
        if (disabled) return;
        if (selectedSet.has(rid)) {
            onChange(value.filter((id) => id !== rid));
        } else {
            onChange([...value, rid]);
        }
    };

    const remove = (rid: string) => {
        if (disabled) return;
        onChange(value.filter((id) => id !== rid));
    };

    const promoteToPrimary = (rid: string) => {
        if (disabled) return;
        if (value[0] === rid) return;
        onChange([rid, ...value.filter((id) => id !== rid)]);
    };

    const triggerLabel = (() => {
        if (orderedSelected.length === 0) return placeholder;
        if (orderedSelected.length === 1) {
            const o = orderedSelected[0];
            return `${o.name}${o.code ? ` (${o.code})` : ''}`;
        }
        return `${orderedSelected.length} branches selected`;
    })();

    return (
        <div className="space-y-2">
            <Listbox
                value={value}
                onChange={(next) => onChange(next as string[])}
                multiple
                disabled={disabled}
            >
                {({ open }) => (
                    <div className="relative">
                        <Listbox.Button
                            id={id}
                            className={cn(
                                'relative w-full h-9 cursor-pointer rounded-md border bg-gray-50/50 hover:bg-white pl-9 pr-9 text-left text-sm transition-colors',
                                'focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
                                open ? 'border-blue-400 bg-white ring-2 ring-blue-500' : 'border-gray-200',
                                disabled && 'opacity-60 cursor-not-allowed',
                            )}
                        >
                            <BuildingOffice2Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <span
                                className={cn(
                                    'flex items-center gap-2 truncate',
                                    orderedSelected.length === 0 && 'text-gray-400',
                                )}
                            >
                                <span className="truncate">{triggerLabel}</span>
                            </span>
                            <ChevronUpDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </Listbox.Button>

                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options className="absolute z-[60] mt-1.5 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 border border-gray-100 focus:outline-none">
                                {options.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-gray-400">
                                        No active branches available.
                                    </div>
                                ) : (
                                    options.map((r) => (
                                        <Listbox.Option
                                            key={r.id}
                                            value={r.id}
                                            className={({ active }) => cn(
                                                'relative cursor-pointer select-none py-2 pl-9 pr-3',
                                                active ? 'bg-blue-50 text-blue-900' : 'text-gray-800',
                                            )}
                                            // Headless UI's multiple-listbox toggles via its own value
                                            // diff; we don't need a manual onClick.
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <span
                                                        className={cn(
                                                            'flex items-center gap-2 truncate',
                                                            selected ? 'font-semibold' : 'font-normal',
                                                        )}
                                                    >
                                                        <span className="truncate">{r.name}</span>
                                                        {r.code && (
                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                · {r.code}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {selected && (
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-blue-600">
                                                            <CheckIcon className="h-4 w-4" />
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))
                                )}
                            </Listbox.Options>
                        </Transition>
                    </div>
                )}
            </Listbox>

            {orderedSelected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {orderedSelected.map((o, idx) => {
                        const isPrimary = idx === 0;
                        return (
                            <span
                                key={o.id}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                    isPrimary
                                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                                        : 'border-gray-200 bg-gray-50 text-gray-700',
                                )}
                            >
                                {showPrimaryControl ? (
                                    <button
                                        type="button"
                                        onClick={() => promoteToPrimary(o.id)}
                                        title={isPrimary ? 'Primary branch (auto-selected on login)' : 'Make primary'}
                                        className={cn(
                                            'flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors',
                                            isPrimary
                                                ? 'text-amber-500 cursor-default'
                                                : 'text-gray-400 hover:text-amber-500',
                                        )}
                                        disabled={isPrimary || disabled}
                                    >
                                        {isPrimary ? (
                                            <StarIconSolid className="h-3.5 w-3.5" />
                                        ) : (
                                            <StarIcon className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                ) : (
                                    isPrimary && (
                                        <StarIconSolid className="h-3 w-3 text-amber-500" />
                                    )
                                )}
                                <span className="truncate max-w-[140px]">{o.name}</span>
                                {o.code && (
                                    <span className="font-mono text-[10px] opacity-70">· {o.code}</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => remove(o.id)}
                                    title="Remove"
                                    className="ml-0.5 rounded-full text-gray-400 hover:bg-white hover:text-red-500 transition-colors"
                                    disabled={disabled}
                                >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Convenience: a single-select fallback that still renders the Listbox style
// but only allows one branch. Used when the consumer wants the same look but
// doesn't need multi-select semantics.
export function RegionSingleSelect({
    value,
    onChange,
    options,
    placeholder = 'Select a branch…',
    id,
    allowClear = false,
    clearLabel = '— No branch —',
}: {
    value: string;
    onChange: (id: string) => void;
    options: RegionOption[];
    placeholder?: string;
    id?: string;
    allowClear?: boolean;
    clearLabel?: string;
}) {
    const selected = options.find((r) => r.id === value);
    return (
        <Listbox value={value} onChange={onChange}>
            {({ open }) => (
                <div className="relative">
                    <Listbox.Button
                        id={id}
                        className={cn(
                            'relative w-full h-9 cursor-pointer rounded-md border bg-gray-50/50 hover:bg-white pl-9 pr-9 text-left text-sm transition-colors',
                            'focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
                            open ? 'border-blue-400 bg-white ring-2 ring-blue-500' : 'border-gray-200',
                        )}
                    >
                        <BuildingOffice2Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        {selected ? (
                            <span className="flex items-center gap-2 truncate">
                                <span className="font-medium text-gray-900 truncate">{selected.name}</span>
                                {selected.code && (
                                    <span className="text-xs text-gray-400 font-mono">· {selected.code}</span>
                                )}
                            </span>
                        ) : (
                            <span className="text-gray-400">{placeholder}</span>
                        )}
                        <ChevronUpDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute z-[60] mt-1.5 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 border border-gray-100 focus:outline-none">
                            {allowClear && (
                                <Listbox.Option
                                    key="__clear__"
                                    value=""
                                    className={({ active }) => cn(
                                        'relative cursor-pointer select-none py-2 pl-9 pr-3 italic text-gray-500',
                                        active ? 'bg-rose-50 text-rose-700' : '',
                                    )}
                                >
                                    {clearLabel}
                                </Listbox.Option>
                            )}
                            {options.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-400">
                                    No active branches available.
                                </div>
                            ) : (
                                options.map((r) => (
                                    <Listbox.Option
                                        key={r.id}
                                        value={r.id}
                                        className={({ active }) => cn(
                                            'relative cursor-pointer select-none py-2 pl-9 pr-3',
                                            active ? 'bg-blue-50 text-blue-900' : 'text-gray-800',
                                        )}
                                    >
                                        {({ selected: isSelected }) => (
                                            <>
                                                <span
                                                    className={cn(
                                                        'flex items-center gap-2 truncate',
                                                        isSelected ? 'font-semibold' : 'font-normal',
                                                    )}
                                                >
                                                    <span className="truncate">{r.name}</span>
                                                    {r.code && (
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            · {r.code}
                                                        </span>
                                                    )}
                                                </span>
                                                {isSelected && (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-blue-600">
                                                        <CheckIcon className="h-4 w-4" />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))
                            )}
                        </Listbox.Options>
                    </Transition>
                </div>
            )}
        </Listbox>
    );
}
