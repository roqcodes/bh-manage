import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ErpVariantSearchRow } from "@/common/erp/purchasing-types";
import { buildIlikePattern } from "@/lib/postgrest-search";

export async function searchPurchaseVariants(query: string, limit = 25): Promise<ErpVariantSearchRow[]> {
  await requireAdminOrManagerProfile();
  const pattern = buildIlikePattern(query);
  if (!pattern) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select("id, name, barcode, purchase_price, tax_rate_percent, products(name)")
    .or(`name.ilike.${pattern},barcode.ilike.${pattern},product_code.ilike.${pattern}`)
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => {
    const product = row.products as { name: string | null } | null;
    return {
      id: row.id,
      name: row.name,
      product_name: product?.name ?? row.name ?? "Product",
      barcode: row.barcode,
      purchase_price: row.purchase_price != null ? Number(row.purchase_price) : null,
      tax_rate_percent: row.tax_rate_percent != null ? Number(row.tax_rate_percent) : null,
    };
  });

  if (rows.length >= limit) return rows;

  const { data: byProduct, error: productError } = await supabase
    .from("product_variants")
    .select("id, name, barcode, purchase_price, tax_rate_percent, products!inner(name)")
    .ilike("products.name", pattern)
    .limit(limit);

  if (productError) throw new Error(productError.message);

  const seen = new Set(rows.map((r) => r.id));
  for (const row of byProduct ?? []) {
    if (seen.has(row.id)) continue;
    const product = row.products as { name: string | null };
    rows.push({
      id: row.id,
      name: row.name,
      product_name: product?.name ?? row.name ?? "Product",
      barcode: row.barcode,
      purchase_price: row.purchase_price != null ? Number(row.purchase_price) : null,
      tax_rate_percent: row.tax_rate_percent != null ? Number(row.tax_rate_percent) : null,
    });
    seen.add(row.id);
  }

  return rows.slice(0, limit);
}
