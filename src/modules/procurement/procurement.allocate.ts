import type {
  AllocationLine,
  ShortageRow,
  VendorProductOffer,
} from "@/modules/procurement/types";

/**
 * Greedy allocation: lowest base_price first, consume stock until shortage covered.
 */
export function allocateShortageForVariant(
  shortage: number,
  offersSortedByPriceAsc: VendorProductOffer[],
): AllocationLine[] {
  if (shortage <= 0) return [];

  let remaining = shortage;
  const out: AllocationLine[] = [];

  for (const offer of offersSortedByPriceAsc) {
    if (remaining <= 0) break;
    const avail = Math.max(0, Math.floor(offer.stock));
    if (avail <= 0) continue;

    const take = Math.min(remaining, avail);
    const base = Number(offer.base_price);
    out.push({
      vendor_id: offer.vendor_id,
      variant_id: offer.variant_id,
      vendor_product_id: offer.id,
      allocated_qty: take,
      base_price: base,
      total_cost: take * base,
    });
    remaining -= take;
  }

  return out;
}

export function computeShortages(
  demandByVariant: Map<string, number>,
  stockByVariant: Map<string, number>,
): ShortageRow[] {
  const rows: ShortageRow[] = [];
  for (const [variant_id, demand_qty] of demandByVariant) {
    const stock = stockByVariant.get(variant_id) ?? 0;
    const shortage = demand_qty - stock;
    if (shortage > 0) {
      rows.push({
        variant_id,
        shortage_qty: shortage,
        inventory_stock: stock,
      });
    }
  }
  return rows;
}
