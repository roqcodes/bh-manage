import type {
  FinalPriceBreakdown,
  PricingRuleInput,
  VendorPricingOverrideInput,
} from "@/modules/pricing/types";

/**
 * Customer-facing unit price from vendor base + catalog pricing rules + optional vendor overrides.
 *
 * Precedence:
 * 1. override_price → final_price (explicit; may be below base)
 * 2. override_margin (vendor) → final = base × (1 + override_margin/100)
 * 3. pricing_rules.margin_percent → final = base × (1 + margin_percent/100)
 * 4. pricing_rules.fixed_markup → final = base + fixed_markup
 * 5. else → final = base
 *
 * margin_amount = final_price - base_price always.
 *
 * If not using explicit override_price, final_price is clamped to ≥ base_price.
 */
export function computeFinalPrice(
  base_price: number,
  rule: PricingRuleInput | null,
  override: VendorPricingOverrideInput | null,
): FinalPriceBreakdown {
  const base = Number(base_price);
  if (!Number.isFinite(base)) {
    return { base_price: 0, margin_amount: 0, final_price: 0 };
  }

  let final_price = base;
  let usedExplicitOverridePrice = false;

  if (
    override?.override_price != null &&
    Number.isFinite(Number(override.override_price))
  ) {
    final_price = Number(override.override_price);
    usedExplicitOverridePrice = true;
  } else if (
    override?.override_margin != null &&
    Number.isFinite(Number(override.override_margin))
  ) {
    const pct = Number(override.override_margin);
    final_price = base * (1 + pct / 100);
  } else if (
    rule?.margin_percent != null &&
    Number.isFinite(Number(rule.margin_percent))
  ) {
    const pct = Number(rule.margin_percent);
    final_price = base * (1 + pct / 100);
  } else if (
    rule?.fixed_markup != null &&
    Number.isFinite(Number(rule.fixed_markup))
  ) {
    final_price = base + Number(rule.fixed_markup);
  } else {
    final_price = base;
  }

  if (!usedExplicitOverridePrice && final_price < base) {
    final_price = base;
  }

  const margin_amount = final_price - base;

  return {
    base_price: base,
    margin_amount,
    final_price,
  };
}
