import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ErpSalesVariantSearchRow } from "@/common/erp/sales-types";
import { getAdminErpContext } from "@/modules/erp/services/store-context.service";
import { buildIlikePattern } from "@/lib/postgrest-search";

type VariantSearchRow = {
  id: string;
  name: string | null;
  barcode: string | null;
  price: number | null;
  purchase_price: number | null;
  tax_rate_percent: number | null;
  products: { name: string | null } | null;
};

function mapVariantRow(
  row: VariantSearchRow,
  storeStockMap: Map<string, { stock: number; sales_price: number | null }>,
): ErpSalesVariantSearchRow {
  const product = row.products;
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
}

async function loadStoreStockMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeId: string | undefined,
  variantIds: string[],
): Promise<Map<string, { stock: number; sales_price: number | null }>> {
  const storeStockMap = new Map<string, { stock: number; sales_price: number | null }>();
  if (!storeId || variantIds.length === 0) return storeStockMap;

  const { data: siRows } = await supabase
    .from("store_inventory")
    .select("variant_id, stock, sales_price")
    .eq("store_id", storeId)
    .in("variant_id", variantIds);

  for (const si of siRows ?? []) {
    storeStockMap.set(si.variant_id, {
      stock: Number(si.stock ?? 0),
      sales_price: si.sales_price != null ? Number(si.sales_price) : null,
    });
  }

  return storeStockMap;
}

export async function searchSalesVariants(
  query: string,
  storeId?: string,
  limit = 25,
): Promise<ErpSalesVariantSearchRow[]> {
  await requireAdminOrManagerProfile();
  const pattern = buildIlikePattern(query);
  if (!pattern) return [];

  const supabase = await createSupabaseServerClient();
  const ctx = await getAdminErpContext();
  const activeStoreId = storeId ?? ctx?.store_id ?? undefined;

  const { data, error } = await supabase
    .from("product_variants")
    .select("id, name, barcode, price, purchase_price, tax_rate_percent, products(name)")
    .or(`name.ilike.${pattern},barcode.ilike.${pattern},product_code.ilike.${pattern}`)
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows: VariantSearchRow[] = (data ?? []) as VariantSearchRow[];
  const seen = new Set(rows.map((row) => row.id));

  if (rows.length < limit) {
    const { data: byProduct, error: productError } = await supabase
      .from("product_variants")
      .select("id, name, barcode, price, purchase_price, tax_rate_percent, products!inner(name)")
      .ilike("products.name", pattern)
      .limit(limit);

    if (productError) throw new Error(productError.message);

    for (const row of (byProduct ?? []) as VariantSearchRow[]) {
      if (seen.has(row.id)) continue;
      rows.push(row);
      seen.add(row.id);
      if (rows.length >= limit) break;
    }
  }

  const storeStockMap = await loadStoreStockMap(
    supabase,
    activeStoreId,
    rows.map((row) => row.id),
  );

  return rows.slice(0, limit).map((row) => mapVariantRow(row, storeStockMap));
}
