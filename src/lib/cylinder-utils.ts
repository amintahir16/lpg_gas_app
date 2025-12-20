/**
 * Utility functions for cylinder type handling
 * These functions are designed to work dynamically with any cylinder type
 */

/**
 * Get display name for cylinder type
 * Fully dynamic - formats any cylinder type enum value
 * Note: For better display with typeName, use the typeName + capacity from database
 */
export function getCylinderTypeDisplayName(type: string | null): string {
  if (!type) return 'N/A';
  
  // Extract capacity from enum name (e.g., "CYLINDER_6KG" -> "6", "DOMESTIC_11_8KG" -> "11.8", "CYLINDER_12_5KG" -> "12.5")
  const capacityMatch = type.match(/(\d+)(?:_(\d+))?/);
  
  if (capacityMatch) {
    // Handle both integer and decimal capacities
    const wholePart = capacityMatch[1];
    const decimalPart = capacityMatch[2];
    const capacity = decimalPart ? `${wholePart}.${decimalPart}` : wholePart;
    
    // Format dynamically - works for any capacity
    return `Cylinder (${capacity}kg)`;
  }
  
  // Fallback: format enum name by replacing underscores with spaces
  return type.replace(/_/g, ' ').replace(/\b(\w)/g, (match) => match.toUpperCase());
}

/**
 * Extract weight from cylinder type enum
 */
export function getCylinderWeight(type: string): number | null {
  const weightMatch = type.match(/(\d+\.?\d*)/);
  if (weightMatch) {
    return parseFloat(weightMatch[1]);
  }
  return null;
}

/**
 * Check if a cylinder type string is valid
 */
export function isValidCylinderType(type: string): boolean {
  // Check if it matches the pattern of cylinder type enums
  return /^[A-Z_]+(\d+\.?\d*)[A-Z_]*$/.test(type);
}

/**
 * Generate a standardized cylinder type enum name from capacity
 * Example: 12 -> "CYLINDER_12KG", 12.5 -> "CYLINDER_12_5KG"
 */
export function generateCylinderTypeFromCapacity(capacity: number): string {
  // Round to 1 decimal place for consistency
  const roundedCapacity = Math.round(capacity * 10) / 10;
  
  // Convert to string and replace decimal point with underscore for enum format
  const capacityStr = roundedCapacity.toString().replace('.', '_');
  
  // Generate enum name: CYLINDER_12KG or CYLINDER_12_5KG
  return `CYLINDER_${capacityStr}KG`;
}

/**
 * Validate if a capacity value is reasonable for a cylinder
 */
export function isValidCylinderCapacity(capacity: number): boolean {
  // Typical cylinder capacities range from 1kg to 100kg
  return capacity > 0 && capacity <= 100;
}

/**
 * Get capacity from cylinder type string
 * Fully dynamic - extracts capacity from any enum value
 * Handles formats like: DOMESTIC_11_8KG, CYLINDER_12KG, CYLINDER_12_5KG
 */
export function getCapacityFromTypeString(type: string): number {
  // Extract capacity from enum - handles both integer and decimal formats
  // Examples: "CYLINDER_12KG" -> 12, "CYLINDER_12_5KG" -> 12.5, "DOMESTIC_11_8KG" -> 11.8
  const capacityMatch = type.match(/(\d+)(?:_(\d+))?/);
  
  if (capacityMatch) {
    const wholePart = capacityMatch[1];
    const decimalPart = capacityMatch[2];
    
    if (decimalPart) {
      // Decimal capacity (e.g., 11_8 -> 11.8, 12_5 -> 12.5)
      return parseFloat(`${wholePart}.${decimalPart}`);
    } else {
      // Integer capacity (e.g., 12 -> 12, 6 -> 6)
      return parseFloat(wholePart);
    }
  }
  
  // Fallback: try simple number extraction
  const simpleMatch = type.match(/(\d+\.?\d*)/);
  return simpleMatch ? parseFloat(simpleMatch[1]) : 15.0; // Default to 15 if can't determine
}

/**
 * Normalize type name to consistent case format (capitalize first letter of each word)
 * This ensures "special", "Special", "SPECIAL" all become "Special"
 * Handles case-insensitive normalization for consistent grouping in inventory
 * 
 * @param typeName - The type name to normalize (e.g., "special", "Special", "SPECIAL")
 * @returns Normalized type name with proper case (e.g., "Special") or null if input is empty
 */
export function normalizeTypeName(typeName: string | null | undefined): string | null {
  if (!typeName) return null;
  const trimmed = typeName.trim();
  if (!trimmed) return null;
  
  // Normalize to lowercase first, then capitalize first letter of each word
  const normalized = trimmed.toLowerCase();
  
  // Map to standard names for consistency (case-insensitive matching)
  if (normalized.includes('domestic')) {
    return 'Domestic';
  } else if (normalized.includes('standard')) {
    return 'Standard';
  } else if (normalized.includes('commercial')) {
    return 'Commercial';
  } else if (normalized.includes('cylinder') && normalized.length <= 10) {
    // If it's just "Cylinder" or similar generic name, return null to use default display
    return null;
  } else {
    // ALWAYS normalize custom names to consistent case format
    // Capitalize first letter of each word, lowercase the rest
    // This ensures "special", "Special", "SPECIAL" all become "Special"
    return normalized.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

/**
 * Get cylinder code prefix from type name or cylinder type
 * Domestic -> DM, Standard -> ST, Commercial -> CM, Custom names -> First two letters
 */
export function getCylinderCodePrefix(input: string, isTypeName: boolean = true): string {
  const normalized = input.trim().toLowerCase();
  
  if (isTypeName) {
    // Input is a type name (e.g., "Domestic", "Standard", "Special")
    if (normalized.includes('domestic')) {
      return 'DM';
    } else if (normalized.includes('standard')) {
      return 'ST';
    } else if (normalized.includes('commercial')) {
      return 'CM';
    } else {
      // For custom names, use first two letters (uppercase)
      const firstTwo = input.trim().substring(0, 2).toUpperCase();
      return firstTwo.length === 1 ? `${firstTwo}X` : firstTwo;
    }
  } else {
    // Input is a cylinder type enum (e.g., "DOMESTIC_11_8KG", "STANDARD_15KG")
    if (normalized === 'domestic_11_8kg' || normalized.includes('domestic')) {
      return 'DM';
    } else if (normalized === 'standard_15kg' || normalized.includes('standard')) {
      return 'ST';
    } else if (normalized === 'commercial_45_4kg' || normalized.includes('commercial')) {
      return 'CM';
    } else if (normalized === 'cylinder_6kg' || (normalized.includes('6') && !normalized.includes('11') && !normalized.includes('15') && !normalized.includes('30') && !normalized.includes('45'))) {
      return 'C6';
    } else if (normalized === 'cylinder_30kg' || normalized.includes('30')) {
      return 'C30';
    } else {
      // For custom types, extract prefix from type string or use CYL
      const match = normalized.match(/cylinder_(\d+)/);
      if (match) {
        return `C${match[1]}`;
      }
      return 'CYL'; // Fallback for unknown types
    }
  }
}

