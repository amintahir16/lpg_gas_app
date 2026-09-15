import type { Prisma } from '@prisma/client';
import { CylinderStatus } from '@prisma/client';
import { prismaB2bCustomerHeldCylinderWhere } from '@/lib/b2b-customer-cylinder-location';

/**
 * Derive the three legacy B2B customer cylinder-due counters from physical stock:
 * cylinders WITH_CUSTOMER held by this customer (id first, exact location fallback).
 * Matches how `/api/customers/b2b/[id]/cylinder-dues` counts dues, and keeps POST/void
 * consistent with variant-aware inventory moves (Plastic vs Standard 15kg, etc.).
 */
export async function getB2bCustomerCylinderDueAggregatesFromPhysicalStock(
  tx: Prisma.TransactionClient,
  params: { customerId: string; customerName: string; regionId: string | null },
): Promise<{
  domestic118kgDue: number;
  standard15kgDue: number;
  commercial454kgDue: number;
}> {
  if (!params.customerId) {
    return { domestic118kgDue: 0, standard15kgDue: 0, commercial454kgDue: 0 };
  }

  const rows = await tx.cylinder.groupBy({
    by: ['cylinderType'],
    where: {
      currentStatus: CylinderStatus.WITH_CUSTOMER,
      ...prismaB2bCustomerHeldCylinderWhere({
        customerId: params.customerId,
        customerName: params.customerName,
      }),
      ...(params.regionId ? { regionId: params.regionId } : {}),
    },
    _count: { id: true },
  });

  let domestic118kgDue = 0;
  let standard15kgDue = 0;
  let commercial454kgDue = 0;

  for (const row of rows) {
    const n = row._count.id;
    switch (row.cylinderType) {
      case 'DOMESTIC_11_8KG':
        domestic118kgDue += n;
        break;
      case 'STANDARD_15KG':
        standard15kgDue += n;
        break;
      case 'COMMERCIAL_45_4KG':
        commercial454kgDue += n;
        break;
      default:
        break;
    }
  }

  return { domestic118kgDue, standard15kgDue, commercial454kgDue };
}
