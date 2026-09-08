"use server";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { invokeRpc } from "@/lib/integrations/supabase/rpc";

export interface BillingVariantSearchResult {
  variantId: string;
  productName: string;
  variantName: string | null;
  price: number;
  stock: number;
}

/** POS / manual online sales: variant picker with online inventory stock. */
export async function searchBillingVariants(
  query: string,
): Promise<BillingVariantSearchResult[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const lowerQuery = query.trim().toLowerCase();

  const { data: variants, error } = await supabase
    .from("product_variants")
    .select("id, name, price, product_id, products(name)")
    .limit(100);

  if (error) throw new Error(error.message);

  const results: BillingVariantSearchResult[] = [];

  for (const v of variants ?? []) {
    const product = v.products as { name?: string | null } | null;
    const pName = product?.name ?? "";
    const vName = v.name ?? "";

    if (
      lowerQuery &&
      !pName.toLowerCase().includes(lowerQuery) &&
      !vName.toLowerCase().includes(lowerQuery)
    ) {
      continue;
    }

    const { data: stockData, error: stockErr } = await invokeRpc(
      supabase,
      "get_variant_online_available",
      { p_variant_id: v.id },
    );
    const stock = stockErr
      ? 0
      : Math.max(0, Math.floor(Number(stockData ?? 0)));

    results.push({
      variantId: v.id,
      productName: pName,
      variantName: vName || null,
      price: Number(v.price ?? 0),
      stock,
    });

    if (results.length >= 20) break;
  }

  return results;
}
