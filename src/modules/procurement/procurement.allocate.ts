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

export interface InventoryReorderRow {
  variant_id: string;
  stock: number;
  reorder_point: number;
  last_reorder_quantity: number | null;
  on_order_qty?: number;
}

/**
 * SKUs below reorder point are flagged for procurement.
 * Uses effective stock (on-hand + open PO qty) like standard inventory systems.
 * Order qty = last PO quantity for this variant, else global default from procurement settings.
 */
export function computeReorderNeeds(
  rows: InventoryReorderRow[],
  defaultOrderQuantity: number,
): ShortageRow[] {
  const out: ShortageRow[] = [];
  const defaultQty = Math.max(1, Math.floor(defaultOrderQuantity));

  for (const row of rows) {
    const stock = Math.max(0, Math.floor(row.stock));
    const onOrder = Math.max(0, Math.floor(row.on_order_qty ?? 0));
    const effectiveStock = stock + onOrder;
    const reorderPoint = Math.max(0, Math.floor(row.reorder_point));
    if (effectiveStock >= reorderPoint) continue;

    const lastQty =
      row.last_reorder_quantity != null
        ? Math.max(1, Math.floor(row.last_reorder_quantity))
        : null;
    const orderQty = lastQty ?? defaultQty;

    out.push({
      variant_id: row.variant_id,
      shortage_qty: orderQty,
      inventory_stock: stock,
      reorder_point: reorderPoint,
      suggested_order_qty: orderQty,
      on_order_qty: onOrder,
      effective_stock: effectiveStock,
    });
  }

  return out;
}
