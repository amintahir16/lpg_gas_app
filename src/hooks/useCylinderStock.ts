import { useState, useEffect, useCallback } from 'react';

interface CylinderStock {
  cylinderType: string;
  available: number;
  costPerItem?: number;
}

interface CylinderStockData {
  cylinders: CylinderStock[];
  loading: boolean;
  error: string | null;
}

/**
 * Optional `enabled` — when false, skip the inventory check fetch.
 * B2B detail passes enabled only while the transaction form is open so page
 * load does not burn three FULL-cylinder scans.
 */
export function useCylinderStock(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;

  const [data, setData] = useState<CylinderStockData>({
    cylinders: [],
    loading: enabled,
    error: null
  });

  const fetchCylinderStock = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      // Check inventory for all cylinder types with 0 requested to get available stock
      const response = await fetch('/api/inventory/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cylinders: [
            { cylinderType: 'DOMESTIC_11_8KG', requested: 0 },
            { cylinderType: 'STANDARD_15KG', requested: 0 },
            { cylinderType: 'COMMERCIAL_45_4KG', requested: 0 }
          ],
          accessories: []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cylinder stock');
      }

      const result = await response.json();
      
      // Extract cylinder stock data
      const cylinders = result.results.map((item: any) => ({
        cylinderType: item.cylinderType,
        available: item.available,
        costPerItem: 0 // We'll add this later if needed
      }));

      setData({
        cylinders,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching cylinder stock:', error);
      setData({
        cylinders: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cylinder stock'
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }
    fetchCylinderStock();
  }, [enabled, fetchCylinderStock]);

  const getCylinderStock = useCallback((cylinderType: string): CylinderStock | null => {
    return data.cylinders.find(cylinder => cylinder.cylinderType === cylinderType) || null;
  }, [data.cylinders]);

  return {
    ...data,
    refetch: fetchCylinderStock,
    getCylinderStock
  };
}
