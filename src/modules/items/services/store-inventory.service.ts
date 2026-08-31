import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { invokeRpc } from "@/lib/integrations/supabase/rpc";

export interface StoreInventoryRow {
  store_id: string;
  variant_id: string;
  stock: number;
  purchase_price: number | null;
  sales_price: number | null;
  opening_stock: number;
  stores: { id: string; name: string } | null;
}

export async function listStoreInventoryForVariant(
  variantId: string,
): Promise<StoreInventoryRow[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("store_inventory")
    .select("store_id, variant_id, stock, purchase_price, sales_price, opening_stock, stores(id, name)")
    .eq("variant_id", variantId);
  if (error) throw new Error(error.message);
  return (data ?? []) as StoreInventoryRow[];
}

export async function upsertStoreInventoryRow(input: {
  storeId: string;
  variantId: string;
  stock?: number;
  purchasePrice?: number | null;
  salesPrice?: number | null;
  openingStock?: number;
}): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  if (input.stock !== undefined) {
    const { error: stockErr } = await invokeRpc(supabase, "set_store_inventory_stock", {
      p_store_id: input.storeId,
      p_variant_id: input.variantId,
      p_stock: input.stock,
    });
    if (stockErr) throw new Error(stockErr.message);
  }

  const pricePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.purchasePrice !== undefined) pricePatch.purchase_price = input.purchasePrice;
  if (input.salesPrice !== undefined) pricePatch.sales_price = input.salesPrice;
  if (input.openingStock !== undefined) pricePatch.opening_stock = input.openingStock;

  if (Object.keys(pricePatch).length > 1) {
    const { error } = await supabase
      .from("store_inventory")
      .upsert({
        store_id: input.storeId,
        variant_id: input.variantId,
        stock: input.stock ?? 0,
        ...pricePatch,
      });
    if (error) throw new Error(error.message);
  }
}
