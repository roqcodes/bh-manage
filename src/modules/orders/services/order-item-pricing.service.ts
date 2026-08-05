import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import {
  computeOrderMargin,
  resolveListPrice,
  resolveReferenceCost,
} from "@/modules/pricing/pricing.resolver";
import { assertCompleteOrderItemSnapshotForInsert } from "@/modules/orders/services/order-items-immutable.service";

const OUT_OF_STOCK_MSG = "Not enough stock in central warehouse";

function finalizeSnapshot(snapshot: OrderItemSnapshot): OrderItemSnapshot {
  assertCompleteOrderItemSnapshotForInsert({
    vendor_id: snapshot.vendor_id,
    base_price: snapshot.base_price,
    final_price: snapshot.final_price,
    margin_amount: snapshot.margin_amount,
    price: snapshot.final_price,
    product_name: snapshot.product_name,
  });
  return snapshot;
}

export interface OrderItemSnapshot {
  vendor_id: string | null;
  base_price: number;
  final_price: number;
  margin_amount: number;
  unit_price: number;
  product_name: string;
}

async function getCentralStock(
  supabase: SupabaseClient,
  variantId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("inventory")
    .select("stock")
    .eq("variant_id", variantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Math.max(0, Math.floor(Number(data?.stock ?? 0)));
}

async function getLowestVendorBase(
  supabase: SupabaseClient,
  variantId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("vendor_products")
    .select("base_price")
    .eq("variant_id", variantId)
    .gt("stock", 0);
  if (error) throw new Error(error.message);

  let min: number | null = null;
  for (const row of data ?? []) {
    const bp = Number(row.base_price ?? 0);
    if (!Number.isFinite(bp) || bp < 0) continue;
    if (min == null || bp < min) min = bp;
  }
  return min;
}

/**
 * Order snapshot: customer pays list price; sale gated on central inventory.
 * base_price stores reference vendor cost for margin reports (not customer price).
 */
export async function buildOrderItemSnapshot(input: {
  variantId: string;
  quantity?: number;
  unitPriceOverride?: number | null;
}): Promise<OrderItemSnapshot> {
  const supabase = await createSupabaseServerClient();
  const qty = Math.max(1, Math.floor(input.quantity ?? 1));

  const { data: variantRow, error: vErr } = await supabase
    .from("product_variants")
    .select("id,product_id,price,name,products(name)")
    .eq("id", input.variantId)
    .maybeSingle();

  if (vErr) throw new Error(vErr.message);
  const variant = variantRow as {
    product_id?: string | null;
    price?: number | null;
    name?: string | null;
    products?: { name?: string | null } | null;
  } | null;
  if (!variant?.product_id) {
    throw new Error("Variant or product not found.");
  }

  const centralStock = await getCentralStock(supabase, input.variantId);
  if (centralStock < qty) {
    throw new Error(
      centralStock === 0
        ? OUT_OF_STOCK_MSG
        : `Only ${centralStock} unit${centralStock !== 1 ? "s" : ""} in central warehouse (requested ${qty}).`,
    );
  }

  const listPrice = resolveListPrice(variant.price);
  if (listPrice <= 0) {
    throw new Error("This SKU has no valid list price. Set a selling price first.");
  }

  const finalPrice =
    input.unitPriceOverride != null && Number.isFinite(input.unitPriceOverride)
      ? resolveListPrice(input.unitPriceOverride)
      : listPrice;

  const referenceCost = resolveReferenceCost(
    await getLowestVendorBase(supabase, input.variantId),
  );

  const product_name =
    [variant.products?.name, variant.name].filter(Boolean).join(" — ") || "Product";

  return finalizeSnapshot({
    vendor_id: null,
    base_price: referenceCost,
    final_price: finalPrice,
    margin_amount: computeOrderMargin(finalPrice, referenceCost),
    unit_price: finalPrice,
    product_name,
  });
}
