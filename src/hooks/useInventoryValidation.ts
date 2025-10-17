import { useState, useCallback } from 'react';

interface InventoryValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  results: Array<{
    cylinderType: string;
    requested: number;
    available: number;
    isValid: boolean;
  }>;
}

export function useInventoryValidation() {
  const [validationState, setValidationState] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateInventory = useCallback(async (cylinders: any[] = [], accessories: any[] = []) => {
    setIsValidating(true);
    
    try {
      const response = await fetch('/api/inventory/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cylinders: cylinders.map(c => ({
            cylinderType: c.cylinderType,
            requested: c.requested || 0
          })),
          accessories: accessories.map(a => ({
            itemName: a.itemName,
            itemType: a.itemType,
            quality: a.quality || '',
            requested: a.requested || 0
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate inventory');
      }

      const data: InventoryValidationResult = await response.json();
      
      // Create validation state map
      const newValidationState: Record<string, boolean> = {};
      data.results.forEach(result => {
        newValidationState[result.cylinderType] = result.isValid;
      });
      
      setValidationState(newValidationState);
      return data;
    } catch (error) {
      console.error('Error validating inventory:', error);
      return { isValid: false, hasErrors: true, results: [] };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const isFieldValid = useCallback((fieldName: string) => {
    return validationState[fieldName] !== false;
  }, [validationState]);

  const hasAnyErrors = useCallback(() => {
    return Object.values(validationState).some(isValid => isValid === false);
  }, [validationState]);

  return {
    validateInventory,
    isFieldValid,
    hasAnyErrors,
    isValidating,
    validationState
  };
}
