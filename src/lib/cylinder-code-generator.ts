import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCylinderCodePrefix } from './cylinder-utils';

type DbClient = Prisma.TransactionClient | typeof prisma;

function formatCylinderCode(prefix: string, n: number): string {
  const padding = n > 9999 ? 5 : 4;
  return `${prefix}-${n.toString().padStart(padding, '0')}`;
}

/** Letters/digits only so the Postgres regex cannot be injected. */
function safeCodePrefix(prefix: string): string {
  const cleaned = prefix.replace(/[^A-Za-z0-9]/g, '');
  return cleaned || 'CX';
}

/**
 * Highest numeric suffix already used for this prefix (DM-0007 → 7).
 * One aggregate query instead of loading every matching code.
 */
async function maxExistingCylinderNumber(
  db: DbClient,
  prefix: string
): Promise<number> {
  const escaped = safeCodePrefix(prefix);
  const rows = await db.$queryRaw<Array<{ max: number | bigint | null }>>(
    Prisma.sql`
      SELECT MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)) AS max
      FROM cylinders
      WHERE code ~* ${'^' + escaped + '[-]?[0-9]+$'}
    `
  );
  return Number(rows[0]?.max ?? 0);
}

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

  let candidateNumber = (await maxExistingCylinderNumber(db, prefix)) + 1;
  while (true) {
    const cylinderCode = formatCylinderCode(prefix, candidateNumber);

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

/**
 * Generate `count` sequential unique codes in one pass — same prefix, numbering
 * and padding rules as `generateUniqueCylinderCode`, but reads existing codes
 * once instead of once per cylinder.
 */
export async function generateCylinderCodeBatch(
  input: string,
  count: number,
  isTypeName: boolean = true,
  tx?: Prisma.TransactionClient
): Promise<string[]> {
  const db = tx || prisma;
  const prefix = getCylinderCodePrefix(input, isTypeName);
  let candidateNumber = (await maxExistingCylinderNumber(db, prefix)) + 1;
  const codes: string[] = [];
  while (codes.length < count) {
    codes.push(formatCylinderCode(prefix, candidateNumber));
    candidateNumber++;
  }
  return codes;
}






