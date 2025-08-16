import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSearchOptions {
  debounceMs?: number;
  initialValue?: string;
}

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 300, initialValue = '' } = options;
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const focusSearch = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    searchInputRef,
    handleSearchChange,
    clearSearch,
    focusSearch,
    setSearchTerm
  };
} 