import { prisma } from '@/lib/prisma';
import { getCylinderCodePrefix } from './cylinder-utils';

/**
 * Generate unique cylinder code based on type name or cylinder type
 * Format: PREFIX-#### (e.g., DM-0001, ST-0001, CM-0001)
 * Supports numbers up to 9999 (4 digits), automatically extends if needed
 * 
 * @param input - Type name (e.g., "Domestic") or cylinder type (e.g., "DOMESTIC_11_8KG")
 * @param isTypeName - Whether input is a type name (true) or cylinder type enum (false)
 * @returns Unique cylinder code (e.g., "DM-0001")
 */
export async function generateUniqueCylinderCode(
  input: string,
  isTypeName: boolean = true
): Promise<string> {
  const prefix = getCylinderCodePrefix(input, isTypeName);
  
  // Find all existing cylinders with this prefix
  const existingCylinders = await prisma.cylinder.findMany({
    where: {
      code: {
        startsWith: prefix
      }
    },
    select: {
      code: true
    },
    orderBy: {
      code: 'desc'
    }
  });
  
  // Extract numbers from existing codes and find the highest
  // Handle both formats: DM-0001 (with dash) and DM0001 (without dash)
  let maxNumber = 0;
  existingCylinders.forEach(cylinder => {
    // Match patterns like:
    // - DM-0001, ST-0001, CM-0001 (with dash, any number of digits)
    // - DM0001, ST0001, CM0001 (without dash, any number of digits)
    // - DM-0001-1234 (with suffix, ignore suffix)
    const match = cylinder.code.match(new RegExp(`^${prefix}[-]?(\\d+)(?:-\\d+)?$`));
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });
  
  // Generate the next sequential number
  const nextNumber = maxNumber + 1;
  
  // Determine padding: use 4 digits for numbers up to 9999, then extend
  // For numbers 1-9999: use 4 digits (DM-0001 to DM-9999)
  // For numbers 10000+: use 5 digits (DM-10000, DM-10001, etc.)
  const padding = nextNumber > 9999 ? 5 : 4;
  const cylinderCode = `${prefix}-${nextNumber.toString().padStart(padding, '0')}`;
  
  // Double-check that this code doesn't exist (safety check)
  const existingCylinder = await prisma.cylinder.findUnique({
    where: { code: cylinderCode }
  });
  
  if (existingCylinder) {
    // If somehow it exists, add a timestamp to make it unique
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${nextNumber.toString().padStart(padding, '0')}-${timestamp}`;
  }
  
  return cylinderCode;
}


