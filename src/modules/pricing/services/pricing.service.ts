import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { computeFinalPrice } from "@/modules/pricing/pricing.compute";
import type { FinalPriceBreakdown, PricingRuleRow } from "@/modules/pricing/types";

export type { PricingRuleRow };

export interface VendorOverrideRow {
  id: string;
  vendor_id: string | null;
  variant_id: string | null;
  override_price: number | null;
  override_margin: number | null;
}

export async function getActivePricingRuleForProduct(
  productId: string,
): Promise<PricingRuleRow | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select("id,product_id,margin_percent,fixed_markup,is_active")
    .eq("product_id", productId)
    .eq("is_active", true)
    .maybeSingle();
  return data as PricingRuleRow | null;
}

/** Latest pricing rule row for a product (admin edit / detail). Not filtered by is_active. */
export async function getProductPricingRule(
  productId: string,
): Promise<PricingRuleRow | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select("id,product_id,margin_percent,fixed_markup,is_active")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PricingRuleRow | null;
}

export interface UpsertProductPricingRuleInput {
  margin_percent: number | null;
  fixed_markup: number | null;
  /** When false or when both margins are null, stored row is inactive. */
  is_active: boolean;
}

/**
 * One row per product: update by id if present, else insert.
 * If both margin and fixed are null → is_active false; otherwise margin wins if both were set.
 */
export async function upsertProductPricingRule(
  productId: string,
  input: UpsertProductPricingRuleInput,
): Promise<void> {
  await requireAdminOrManagerProfile();

  let margin = input.margin_percent;
  let fixed = input.fixed_markup;

  if (margin != null && margin < 0) {
    throw new Error("Margin % must be ≥ 0.");
  }
  if (fixed != null && fixed < 0) {
    throw new Error("Fixed markup must be ≥ 0.");
  }

  if (
    margin != null &&
    Number.isFinite(margin) &&
    fixed != null &&
    Number.isFinite(fixed)
  ) {
    fixed = null;
  }

  const bothNull =
    margin == null &&
    fixed == null;

  const is_active = bothNull ? false : input.is_active;

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("pricing_rules")
    .select("id,product_id,margin_percent,fixed_markup,is_active")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    product_id: productId,
    margin_percent: bothNull ? null : margin,
    fixed_markup: bothNull ? null : fixed,
    is_active,
  };

  if (existing) {
    const { error } = await supabase
      .from("pricing_rules")
      .update({
        margin_percent: payload.margin_percent,
        fixed_markup: payload.fixed_markup,
        is_active: payload.is_active,
      })
      .eq("id", existing.id as string);
    if (error) throw new Error(error.message);
    return;
  }

  if (bothNull) {
    return;
  }

  const { error } = await supabase.from("pricing_rules").insert(payload);
  if (error) throw new Error(error.message);
}


export async function getVendorPricingOverride(
  vendorId: string,
  variantId: string,
): Promise<VendorOverrideRow | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("vendor_pricing_overrides")
    .select("id,vendor_id,variant_id,override_price,override_margin")
    .eq("vendor_id", vendorId)
    .eq("variant_id", variantId)
    .maybeSingle();
  return data as VendorOverrideRow | null;
}

/**
 * Loads rule + override from DB and returns breakdown (read-only).
 */
export async function computePricingForVariantVendor(
  productId: string,
  variantId: string,
  vendorId: string,
  basePrice: number,
): Promise<FinalPriceBreakdown> {
  const [rule, override] = await Promise.all([
    getActivePricingRuleForProduct(productId),
    getVendorPricingOverride(vendorId, variantId),
  ]);

  return computeFinalPrice(
    basePrice,
    rule
      ? {
          margin_percent: rule.margin_percent,
          fixed_markup: rule.fixed_markup,
        }
      : null,
    override
      ? {
          override_price: override.override_price,
          override_margin: override.override_margin,
        }
      : null,
  );
}

/**
 * Preview without persisting anything (uses same reads as compute path).
 */
export async function previewPricingForVariantVendor(input: {
  productId: string;
  variantId: string;
  vendorId: string;
  basePrice: number;
}): Promise<FinalPriceBreakdown> {
  return computePricingForVariantVendor(
    input.productId,
    input.variantId,
    input.vendorId,
    input.basePrice,
  );
}
