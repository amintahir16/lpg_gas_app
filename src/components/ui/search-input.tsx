import React, { forwardRef, useState, useCallback } from 'react';
import { Input } from './input';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder = "Search...", className, debounceMs = 300, value, onChange, ...props }, ref) => {
    const [internalSearchTerm, setInternalSearchTerm] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInternalSearchTerm(value);
      onChange?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Select all text when focused
      e.target.select();
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className={cn("relative", className)}>
        <MagnifyingGlassIcon 
          className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-200",
            isFocused ? "text-blue-500" : "text-gray-400"
          )} 
        />
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value || internalSearchTerm}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn("pl-10 transition-all duration-200", {
            "ring-2 ring-blue-500 ring-opacity-50 border-blue-500": isFocused,
            "border-gray-300": !isFocused
          })}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput'; 