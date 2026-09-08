import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ErpProductSearchRow } from "@/common/erp/purchasing-types";
import { buildIlikePattern } from "@/lib/postgrest-search";

/** ERP purchasing catalog: product-level (no variants). */
export async function searchPurchaseProducts(
  query: string,
  limit = 25,
): Promise<ErpProductSearchRow[]> {
  await requireAdminOrManagerProfile();
  const pattern = buildIlikePattern(query);
  if (!pattern) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, barcode, purchase_price, tax_rate_percent")
    .eq("is_active", true)
    .eq("item_type", "goods")
    .or(`name.ilike.${pattern},barcode.ilike.${pattern}`)
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    product_name: row.name ?? "Product",
    barcode: row.barcode,
    purchase_price: row.purchase_price != null ? Number(row.purchase_price) : null,
    tax_rate_percent: row.tax_rate_percent != null ? Number(row.tax_rate_percent) : null,
  }));
}

/** @deprecated Use searchPurchaseProducts */
export async function searchPurchaseVariants(
  query: string,
  limit = 25,
): Promise<ErpProductSearchRow[]> {
  return searchPurchaseProducts(query, limit);
}
