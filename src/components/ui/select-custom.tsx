'use client';

import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value?: string;
    defaultValue?: string; // Add defaultValue prop
    onChange?: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
}

export function CustomSelect({ value, defaultValue, onChange, options, placeholder = "Select...", className, buttonClassName, name, disabled, required }: CustomSelectProps) {
    // Finds the selected option object based on the value prop (controlled) or matches internal state if uncontrolled (simplified here for controlled usage mostly)
    const selectedOption = options.find(o => o.value === value) || null;
    const [internalValue, setInternalValue] = useState<string>(defaultValue || '');

    // Handle change: if external handler provided, use it.
    // Note: For native form submission (name prop), we render a hidden input.
    const handleChange = (val: string) => {
        setInternalValue(val);
        if (onChange) onChange(val);
    };

    const displayLabel = selectedOption ? selectedOption.label : (options.find(o => o.value === internalValue)?.label || placeholder);
    const activeValue = value !== undefined ? value : internalValue;

    return (
        <div className={cn("relative w-full", className)}>
            {/* Hidden input for Form Data submission */}
            {name && <input type="hidden" name={name} value={activeValue} required={required} />}

            <Listbox value={activeValue} onChange={handleChange} disabled={disabled}>
                <Listbox.Button className={cn(
                    "relative w-full cursor-pointer rounded-md bg-white py-2 pl-3 pr-10 text-left border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 h-9 sm:text-sm",
                    buttonClassName
                )}>
                    <span className={cn("block truncate", !selectedOption && !internalValue && "text-gray-400")}>
                        {displayLabel}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon
                            className="h-4 w-4 text-gray-400"
                            aria-hidden="true"
                        />
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options
                        anchor="bottom start"
                        className="absolute z-50 mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                    >
                        {options.map((option, personIdx) => (
                            <Listbox.Option
                                key={option.value}
                                className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`
                                }
                                value={option.value}
                            >
                                {({ selected }) => (
                                    <>
                                        <span
                                            className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                                }`}
                                        >
                                            {option.label}
                                        </span>
                                        {selected ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </Listbox>
        </div>
    );
}
