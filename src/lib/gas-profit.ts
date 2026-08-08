/**
 * Gas profit helpers.
 *
 * Margin categories set the *suggested* selling price (plant cost/kg + margin/kg).
 * Realized profit must track the actual unit price so edits raise/lower profit.
 */

export function calculateGasUnitCostFromPlant(
  plantPrice118kg: number,
  capacityKg: number
): number {
  const plant = Number(plantPrice118kg) || 0;
  const capacity = Number(capacityKg) || 0;
  if (plant <= 0 || capacity <= 0) return 0;
  return Math.round((plant / 11.8) * capacity);
}

/**
 * Realized line profit for a gas cylinder sale.
 * Prefers (pricePerItem − costPrice) × qty when cost is known.
 * Falls back to marginPerKg × capacity × qty for historical rows without cost.
 */
export function calculateGasLineProfit(params: {
  pricePerItem: number;
  quantity: number;
  costPrice?: number | null;
  capacityKg?: number | null;
  marginPerKg?: number | null;
}): number {
  const qty = Number(params.quantity) || 0;
  if (qty === 0) return 0;

  const sell = Number(params.pricePerItem) || 0;
  const cost = Number(params.costPrice) || 0;

  if (cost > 0) {
    return (sell - cost) * qty;
  }

  const margin = Number(params.marginPerKg) || 0;
  const capacity = Number(params.capacityKg) || 0;
  if (margin > 0 && capacity > 0) {
    return margin * capacity * qty;
  }

  return 0;
}
