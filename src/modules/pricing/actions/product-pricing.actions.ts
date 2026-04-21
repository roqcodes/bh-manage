"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { upsertProductPricingRule } from "@/modules/pricing/services/pricing.service";

const upsertSchema = z.object({
  productId: z.string().uuid(),
  marginPercent: z.number().min(0).nullable(),
  fixedMarkup: z.number().min(0).nullable(),
  isActive: z.boolean(),
});

export async function upsertProductPricingRuleAction(
  input: z.infer<typeof upsertSchema>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.flatten().formErrors[0] ?? "Invalid input.",
    };
  }

  try {
    await upsertProductPricingRule(parsed.data.productId, {
      margin_percent: parsed.data.marginPercent,
      fixed_markup: parsed.data.fixedMarkup,
      is_active: parsed.data.isActive,
    });
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Save failed.",
    };
  }

  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { ok: true };
}
