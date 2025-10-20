import { useState, useEffect, useCallback } from 'react';
import { DynamicAccessoryItem } from '@/app/api/inventory/accessories/dynamic/route';

interface DynamicInventoryData {
  regulators: DynamicAccessoryItem[];
  gasPipes: DynamicAccessoryItem[];
  stoves: DynamicAccessoryItem[];
  lastUpdated: string;
}

interface UseDynamicInventoryReturn {
  data: DynamicInventoryData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getItemsByCategory: (category: 'regulators' | 'gasPipes' | 'stoves') => DynamicAccessoryItem[];
}

export function useDynamicInventory(): UseDynamicInventoryReturn {
  const [data, setData] = useState<DynamicInventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching dynamic inventory...');
      const response = await fetch('/api/inventory/accessories/dynamic');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch inventory data');
      }

      setData(result.data);
      console.log('✅ Dynamic inventory fetched successfully:', result.data);
    } catch (err) {
      console.error('❌ Error fetching dynamic inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getItemsByCategory = useCallback((category: 'regulators' | 'gasPipes' | 'stoves'): DynamicAccessoryItem[] => {
    if (!data) return [];
    return data[category] || [];
  }, [data]);

  useEffect(() => {
    fetchInventory();
    // Removed auto-refresh to prevent interruption during large transactions
  }, [fetchInventory]);

  return {
    data,
    loading,
    error,
    refresh: fetchInventory,
    getItemsByCategory,
  };
}
