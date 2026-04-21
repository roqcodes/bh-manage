import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ProductAtGlanceMetrics } from "@/common/admin/types";
import { computeFinalPrice } from "@/modules/pricing/pricing.compute";
import { getActivePricingRuleForProduct } from "@/modules/pricing/services/pricing.service";

export type { ProductAtGlanceMetrics };

type OfferRow = {
  variant_id: string | null;
  vendor_id: string | null;
  base_price: number | null;
};

type OverrideRow = {
  vendor_id: string | null;
  variant_id: string | null;
  override_price: number | null;
  override_margin: number | null;
};

/**
 * Catalog “at a glance”: central inventory totals + live sell price using the same
 * vendor base + active product rule + vendor overrides as checkout pricing.
 */
export async function getProductAtGlanceMetrics(
  productId: string,
  variantIds: string[],
): Promise<ProductAtGlanceMetrics> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  if (variantIds.length === 0) {
    return {
      centralStockTotal: 0,
      livePriceMin: null,
      livePriceMax: null,
      variantsWithLivePrice: 0,
    };
  }

  const [rule, invRes, offersRes, ovRes] = await Promise.all([
    getActivePricingRuleForProduct(productId),
    supabase.from("inventory").select("stock").in("variant_id", variantIds),
    supabase
      .from("vendor_products")
      .select("variant_id,vendor_id,base_price,stock")
      .in("variant_id", variantIds)
      .gt("stock", 0),
    supabase
      .from("vendor_pricing_overrides")
      .select("vendor_id,variant_id,override_price,override_margin")
      .in("variant_id", variantIds),
  ]);

  if (invRes.error) throw new Error(invRes.error.message);
  if (offersRes.error) throw new Error(offersRes.error.message);
  if (ovRes.error) throw new Error(ovRes.error.message);

  let centralStockTotal = 0;
  for (const r of invRes.data ?? []) {
    centralStockTotal += Math.max(
      0,
      Math.floor(Number((r as { stock?: number | null }).stock ?? 0)),
    );
  }

  const ruleInput =
    rule && rule.is_active
      ? {
          margin_percent: rule.margin_percent,
          fixed_markup: rule.fixed_markup,
        }
      : null;

  const overrideMap = new Map<string, OverrideRow>();
  for (const o of (ovRes.data ?? []) as OverrideRow[]) {
    const vid = o.variant_id;
    const vend = o.vendor_id;
    if (vid && vend) overrideMap.set(`${vend}:${vid}`, o);
  }

  const byVariant = new Map<string, OfferRow[]>();
  for (const row of (offersRes.data ?? []) as OfferRow[]) {
    const vid = row.variant_id;
    if (!vid) continue;
    const list = byVariant.get(vid) ?? [];
    list.push(row);
    byVariant.set(vid, list);
  }

  const bestPerVariant: number[] = [];
  for (const vid of variantIds) {
    const offers = byVariant.get(vid) ?? [];
    if (offers.length === 0) continue;

    let best: number | null = null;
    for (const o of offers) {
      const vendorId = o.vendor_id;
      if (!vendorId) continue;
      const base = Number(o.base_price ?? 0);
      const ov = overrideMap.get(`${vendorId}:${vid}`);
      const b = computeFinalPrice(
        base,
        ruleInput,
        ov
          ? {
              override_price: ov.override_price,
              override_margin: ov.override_margin,
            }
          : null,
      );
      if (best == null || b.final_price < best) best = b.final_price;
    }
    if (best != null) bestPerVariant.push(best);
  }

  if (bestPerVariant.length === 0) {
    return {
      centralStockTotal,
      livePriceMin: null,
      livePriceMax: null,
      variantsWithLivePrice: 0,
    };
  }

  return {
    centralStockTotal,
    livePriceMin: Math.min(...bestPerVariant),
    livePriceMax: Math.max(...bestPerVariant),
    variantsWithLivePrice: bestPerVariant.length,
  };
}
