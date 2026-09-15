import type { Prisma } from '@prisma/client';

/**
 * Canonical B2B holding location string written on assign.
 * Existing production rows use this exact format (no customer id in the string).
 */
export function b2bCustomerCylinderLocation(customerName: string | null | undefined): string {
  return `Customer: ${customerName || 'Unknown'}`;
}

/** Exact location strings that may exist for this customer (raw name + trimmed). */
export function b2bCustomerExactCylinderLocations(
  customerName: string | null | undefined,
): string[] {
  const trimmedName = (customerName || '').trim();
  if (!trimmedName) return [];
  const exact = b2bCustomerCylinderLocation(customerName);
  const trimmed = `Customer: ${trimmedName}`;
  return exact === trimmed ? [exact] : [exact, trimmed];
}

export function prismaB2bCustomerExactLocationClauses(
  customerName: string | null | undefined,
): Prisma.CylinderWhereInput[] {
  return b2bCustomerExactCylinderLocations(customerName).map((location) => ({
    location: { equals: location, mode: 'insensitive' },
  }));
}

export function prismaB2bCustomerHeldCylinderOrClauses(params: {
  customerId: string;
  customerName: string | null | undefined;
}): Prisma.CylinderWhereInput[] {
  return [
    { heldByCustomerId: params.customerId },
    { location: { contains: params.customerId } },
    ...prismaB2bCustomerExactLocationClauses(params.customerName),
  ] as Prisma.CylinderWhereInput[];
}

/**
 * Identify cylinders held by one B2B customer:
 * 1) heldByCustomerId (source of truth after assign / backfill)
 * 2) location containing the customer id (legacy encoded-id rows)
 * 3) exact `Customer: <name>` equality for existing production rows
 *
 * Never uses location CONTAINS name — that matches "Black Cafe" to "Black Cafe Gulbahar".
 */
export function prismaB2bCustomerHeldCylinderWhere(params: {
  customerId: string;
  customerName: string | null | undefined;
}): Prisma.CylinderWhereInput {
  return {
    OR: prismaB2bCustomerHeldCylinderOrClauses(params),
  };
}

export function b2bAssignHeldCylinderData(customer: { id: string; name?: string | null }) {
  return {
    location: b2bCustomerCylinderLocation(customer.name),
    heldByCustomerId: customer.id,
  };
}

export function b2bReleaseHeldCylinderData(location: string) {
  return {
    location,
    heldByCustomerId: null as string | null,
  };
}

export function locationBelongsToB2bCustomer(
  location: string | null | undefined,
  customer: { id: string; name: string },
): boolean {
  if (!location) return false;
  if (location.includes(customer.id)) return true;
  const loc = location.trim().toLowerCase();
  return b2bCustomerExactCylinderLocations(customer.name).some(
    (candidate) => candidate.trim().toLowerCase() === loc,
  );
}
