import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getCylinderCodePrefix } from './cylinder-utils';

/**
 * Generate unique cylinder code based on type name or cylinder type
 * Format: PREFIX-#### (e.g., DM-0001, ST-0001, CM-0001)
 * Supports numbers up to 9999 (4 digits), automatically extends if needed
 * 
 * @param input - Type name (e.g., "Domestic") or cylinder type (e.g., "DOMESTIC_11_8KG")
 * @param isTypeName - Whether input is a type name (true) or cylinder type enum (false)
 * @param tx - Optional Prisma transaction client
 * @param usedCodes - Optional Set of codes already generated in the current operation
 * @returns Unique cylinder code (e.g., "DM-0001")
 */
export async function generateUniqueCylinderCode(
  input: string,
  isTypeName: boolean = true,
  tx?: Prisma.TransactionClient,
  usedCodes?: Set<string>
): Promise<string> {
  const db = tx || prisma;
  const prefix = getCylinderCodePrefix(input, isTypeName);
  
  // Find all existing cylinders with this prefix (case-insensitive)
  const existingCylinders = await db.cylinder.findMany({
    where: {
      code: {
        startsWith: prefix,
        mode: 'insensitive'
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
  let maxNumber = 0;
  existingCylinders.forEach(cylinder => {
    const match = cylinder.code.match(new RegExp(`^${prefix}[-]?(\\d+)`, 'i'));
    if (match) {
      const number = parseInt(match[1], 10);
      if (Number.isFinite(number) && number > maxNumber) {
        maxNumber = number;
      }
    }
  });
  
  // Find the next available number that does not exist in DB or usedCodes
  let candidateNumber = maxNumber + 1;
  while (true) {
    const padding = candidateNumber > 9999 ? 5 : 4;
    const cylinderCode = `${prefix}-${candidateNumber.toString().padStart(padding, '0')}`;

    if (usedCodes?.has(cylinderCode)) {
      candidateNumber++;
      continue;
    }

    const existingCylinder = await db.cylinder.findUnique({
      where: { code: cylinderCode },
      select: { id: true }
    });

    if (!existingCylinder) {
      if (usedCodes) {
        usedCodes.add(cylinderCode);
      }
      return cylinderCode;
    }

    candidateNumber++;
  }
}






