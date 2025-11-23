/**
 * Utility functions for cylinder type handling
 * These functions are designed to work dynamically with any cylinder type
 */

/**
 * Get display name for cylinder type
 * Dynamically formats any cylinder type enum value
 */
export function getCylinderTypeDisplayName(type: string | null): string {
  if (!type) return 'N/A';
  
  // Extract weight from enum name (e.g., "CYLINDER_6KG" -> "6kg", "DOMESTIC_11_8KG" -> "11.8kg")
  const weightMatch = type.match(/(\d+\.?\d*)/);
  
  if (weightMatch) {
    const weight = weightMatch[1];
    
    // Handle special cases with friendly names
    if (type === 'DOMESTIC_11_8KG') {
      return 'Domestic (11.8kg)';
    } else if (type === 'STANDARD_15KG') {
      return 'Standard (15kg)';
    } else if (type === 'COMMERCIAL_45_4KG') {
      return 'Commercial (45.4kg)';
    } else if (type === 'CYLINDER_6KG') {
      return 'Cylinder (6kg)';
    } else if (type === 'CYLINDER_30KG') {
      return 'Cylinder (30kg)';
    } else {
      // For any other type, format dynamically
      // Extract the weight and format nicely
      return `Cylinder (${weight}kg)`;
    }
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

