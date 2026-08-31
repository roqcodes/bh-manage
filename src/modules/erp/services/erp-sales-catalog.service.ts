import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ErpSalesVariantSearchRow } from "@/common/erp/sales-types";
import { getAdminErpContext } from "@/modules/erp/services/store-context.service";

export async function searchSalesVariants(
  query: string,
  storeId?: string,
  limit = 25,
): Promise<ErpSalesVariantSearchRow[]> {
  await requireAdminOrManagerProfile();
  const q = query.trim();
  if (!q) return [];

  const supabase = await createSupabaseServerClient();
  const ctx = await getAdminErpContext();
  const activeStoreId = storeId ?? ctx?.store_id;
  const pattern = `%${q}%`;

  const { data, error } = await supabase
    .from("product_variants")
    .select("id, name, barcode, price, purchase_price, tax_rate_percent, products(name)")
    .or(`name.ilike.${pattern},barcode.ilike.${pattern},product_code.ilike.${pattern}`)
    .limit(limit);

  if (error) throw new Error(error.message);

  const variantIds = (data ?? []).map((r) => r.id);
  const storeStockMap = new Map<string, { stock: number; sales_price: number | null }>();

  if (activeStoreId && variantIds.length > 0) {
    const { data: siRows } = await supabase
      .from("store_inventory")
      .select("variant_id, stock, sales_price")
      .eq("store_id", activeStoreId)
      .in("variant_id", variantIds);
    for (const si of siRows ?? []) {
      storeStockMap.set(si.variant_id, {
        stock: Number(si.stock ?? 0),
        sales_price: si.sales_price != null ? Number(si.sales_price) : null,
      });
    }
  }

  return (data ?? []).map((row) => {
    const product = row.products as { name: string | null } | null;
    const si = storeStockMap.get(row.id);
    return {
      id: row.id,
      name: row.name,
      product_name: product?.name ?? row.name ?? "Product",
      barcode: row.barcode,
      sales_price: si?.sales_price ?? (row.price != null ? Number(row.price) : null),
      purchase_price: row.purchase_price != null ? Number(row.purchase_price) : null,
      tax_rate_percent: row.tax_rate_percent != null ? Number(row.tax_rate_percent) : null,
      available_stock: si?.stock ?? 0,
    };
  });
}
