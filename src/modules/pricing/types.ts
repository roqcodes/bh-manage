/** DB row shape for `pricing_rules` (admin + services). */
export interface PricingRuleRow {
  id: string;
  product_id: string | null;
  margin_percent: number | null;
  fixed_markup: number | null;
  is_active: boolean | null;
}

/** Pure pricing inputs (no DB). */

export interface PricingRuleInput {
  margin_percent: number | null;
  fixed_markup: number | null;
}

export interface VendorPricingOverrideInput {
  override_price: number | null;
  override_margin: number | null;
}

export interface FinalPriceBreakdown {
  base_price: number;
  margin_amount: number;
  final_price: number;
}
