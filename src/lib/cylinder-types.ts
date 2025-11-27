/**
 * Cylinder Type Constants and Utilities
 * Centralized definition of all cylinder types for consistent use across the application
 */

import { getCylinderTypeDisplayName, getCylinderWeight } from './cylinder-utils';

/**
 * All available cylinder types in the system
 * This should match the CylinderType enum in prisma/schema.prisma
 */
export const CYLINDER_TYPES = [
  'CYLINDER_6KG',
  'DOMESTIC_11_8KG',
  'STANDARD_15KG',
  'CYLINDER_30KG',
  'COMMERCIAL_45_4KG',
] as const;

export type CylinderType = typeof CYLINDER_TYPES[number];

/**
 * Cylinder type configuration with display names and metadata
 */
export interface CylinderTypeConfig {
  value: CylinderType;
  label: string;
  capacity: number;
  securityPrice?: number; // Optional security deposit price
}

/**
 * Get all cylinder types with their display names and capacities
 */
export function getCylinderTypeConfigs(): CylinderTypeConfig[] {
  return CYLINDER_TYPES.map(type => ({
    value: type,
    label: getCylinderTypeDisplayName(type),
    capacity: getCylinderWeight(type) || 0,
  }));
}

/**
 * Get cylinder type config with security prices (for B2C transactions)
 */
export function getCylinderTypeConfigsWithSecurity(): CylinderTypeConfig[] {
  const configs = getCylinderTypeConfigs();
  
  // Add security prices (these can be moved to database in future)
  const securityPrices: Record<CylinderType, number> = {
    'CYLINDER_6KG': 20000,
    'DOMESTIC_11_8KG': 30000,
    'STANDARD_15KG': 50000,
    'CYLINDER_30KG': 70000,
    'COMMERCIAL_45_4KG': 90000,
  };
  
  return configs.map(config => ({
    ...config,
    securityPrice: securityPrices[config.value],
  }));
}

/**
 * Get cylinder type options for dropdowns
 */
export function getCylinderTypeOptions() {
  return getCylinderTypeConfigs().map(config => ({
    value: config.value,
    label: config.label,
  }));
}

/**
 * Get cylinder type options with security prices (for B2C)
 */
export function getCylinderTypeOptionsWithSecurity() {
  return getCylinderTypeConfigsWithSecurity().map(config => ({
    value: config.value,
    label: config.label,
    securityPrice: config.securityPrice,
  }));
}

/**
 * Validate if a string is a valid cylinder type
 */
export function isValidCylinderType(type: string): type is CylinderType {
  return CYLINDER_TYPES.includes(type as CylinderType);
}

