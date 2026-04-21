"use server";

import { previewPricingForVariantVendor } from "@/modules/pricing/services/pricing.service";
import type { FinalPriceBreakdown } from "@/modules/pricing/types";

export async function previewPricingAction(input: {
  productId: string;
  variantId: string;
  vendorId: string;
  basePrice: number;
}): Promise<FinalPriceBreakdown> {
  return previewPricingForVariantVendor(input);
}
