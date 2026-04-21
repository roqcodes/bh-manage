import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { computeFinalPrice } from "@/modules/pricing/pricing.compute";
import type { FinalPriceBreakdown } from "@/modules/pricing/types";
import { assertCompleteOrderItemSnapshotForInsert } from "@/modules/orders/services/order-items-immutable.service";

/**
 * Loads `pricing_rules` + `vendor_pricing_overrides` and applies {@link computeFinalPrice}.
 * `final_price` is never set to `base_price` without running that logic.
 */
async function computeFinalPriceForOrderItem(
  supabase: SupabaseClient,
  productId: string,
  variantId: string,
  vendorId: string,
  basePrice: number,
): Promise<FinalPriceBreakdown> {
  const [ruleRes, ovRes] = await Promise.all([
    supabase
      .from("pricing_rules")
      .select("margin_percent,fixed_markup")
      .eq("product_id", productId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("vendor_pricing_overrides")
      .select("override_price,override_margin")
      .eq("vendor_id", vendorId)
      .eq("variant_id", variantId)
      .maybeSingle(),
  ]);

  const rule = ruleRes.data;
  const ov = ovRes.data;

  return computeFinalPrice(
    basePrice,
    rule
      ? {
          margin_percent: rule.margin_percent as number | null,
          fixed_markup: rule.fixed_markup as number | null,
        }
      : null,
    ov
      ? {
          override_price: ov.override_price as number | null,
          override_margin: ov.override_margin as number | null,
        }
      : null,
  );
}

const NO_VENDOR_MSG = "Some Of The Products Are Out Of Stock";

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
  vendor_id: string;
  base_price: number;
  final_price: number;
  margin_amount: number;
  unit_price: number;
  product_name: string;
}

/**
 * Snapshots vendor_id, base_price, final_price, margin for order_items at order time.
 * `final_price` comes from {@link computeFinalPrice} (pricing rules + overrides), not raw vendor base.
 * Requires at least one vendor_products row with stock &gt; 0 for the variant.
 */
export async function buildOrderItemSnapshot(input: {
  variantId: string;
  preferredVendorId?: string | null;
}): Promise<OrderItemSnapshot> {
  const supabase = await createSupabaseServerClient();

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

  const productId = variant.product_id;
  const product_name =
    [variant.products?.name, variant.name].filter(Boolean).join(" — ") || "Product";

  const { data: offers, error: oErr } = await supabase
    .from("vendor_products")
    .select("vendor_id,base_price,stock")
    .eq("variant_id", input.variantId)
    .gt("stock", 0);

  if (oErr) throw new Error(oErr.message);

  const list = offers ?? [];

  if (list.length === 0) {
    throw new Error(NO_VENDOR_MSG);
  }

  if (input.preferredVendorId) {
    const row = list.find((o) => o.vendor_id === input.preferredVendorId);
    if (row) {
      const base = Number(row.base_price ?? 0);
      const b = await computeFinalPriceForOrderItem(
        supabase,
        productId,
        input.variantId,
        row.vendor_id as string,
        base,
      );
      return finalizeSnapshot({
        vendor_id: row.vendor_id as string,
        base_price: b.base_price,
        final_price: b.final_price,
        margin_amount: b.margin_amount,
        unit_price: b.final_price,
        product_name,
      });
    }
  }

  let best: { vendor_id: string; breakdown: FinalPriceBreakdown } | null = null;
  for (const o of list) {
    const base = Number(o.base_price ?? 0);
    const b = await computeFinalPriceForOrderItem(
      supabase,
      productId,
      input.variantId,
      o.vendor_id as string,
      base,
    );
    if (!best || b.final_price < best.breakdown.final_price) {
      best = { vendor_id: o.vendor_id as string, breakdown: b };
    }
  }

  if (!best) {
    throw new Error(NO_VENDOR_MSG);
  }

  return finalizeSnapshot({
    vendor_id: best.vendor_id,
    base_price: best.breakdown.base_price,
    final_price: best.breakdown.final_price,
    margin_amount: best.breakdown.margin_amount,
    unit_price: best.breakdown.final_price,
    product_name,
  });
}
