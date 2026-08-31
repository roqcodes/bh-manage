import "server-only";

import {
  requireAdminOnlyProfile,
  requireAdminOrManagerProfile,
} from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  InventoryCatalogStats,
  InventoryWithVariant,
  Paginated,
} from "@/common/admin/types";
import { PAGE_SIZE } from "@/common/admin/types";
import { DEFAULT_REORDER_POINT, getProcurementDefaults } from "@/modules/procurement/services/procurement.service";
import { invokeRpc } from "@/lib/integrations/supabase/rpc";

export async function getInventory(
  page = 0,
): Promise<Paginated<InventoryWithVariant>> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  const [dataResult, countResult] = await Promise.all([
    supabase
      .from("inventory")
      .select(
        "variant_id,stock,reorder_point,last_reorder_quantity,updated_at,product_variants(id,name,products(id,name),variant_images(url,is_preview,sort_order))",
      )
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("inventory")
      .select("variant_id", { count: "exact", head: true }),
  ]);

  return {
    data: (dataResult.data ?? []) as unknown as InventoryWithVariant[],
    total: countResult.count ?? 0,
  };
}

export async function getInventoryCatalogStats(): Promise<InventoryCatalogStats> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("inventory")
    .select("stock,reorder_point");

  if (error) throw new Error(error.message);

  let criticalSkus = 0;
  let lowStockSkus = 0;
  let healthySkus = 0;

  for (const row of data ?? []) {
    const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
    const reorderPoint = Math.max(
      0,
      Math.floor(Number(row.reorder_point ?? DEFAULT_REORDER_POINT)),
    );
    if (stock < 1) {
      criticalSkus += 1;
    } else if (stock < reorderPoint) {
      lowStockSkus += 1;
    } else {
      healthySkus += 1;
    }
  }

  return {
    totalSkus: (data ?? []).length,
    criticalSkus,
    lowStockSkus,
    healthySkus,
  };
}

export async function insertInventoryRow(
  variantId: string,
  stock = 0,
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const defaults = await getProcurementDefaults();

  const { data: settings, error: storeErr } = await supabase
    .from("app_settings")
    .select("default_store_id")
    .eq("id", 1)
    .maybeSingle();
  if (storeErr) throw new Error(storeErr.message);

  const defaultStoreId = settings?.default_store_id;

  if (defaultStoreId) {
    const { error: siErr } = await invokeRpc(supabase, "set_store_inventory_stock", {
      p_store_id: defaultStoreId,
      p_variant_id: variantId,
      p_stock: stock,
    });
    if (siErr) throw new Error(siErr.message);
  } else {
    const { error } = await supabase.from("inventory").insert({
      variant_id: variantId,
      stock,
      reorder_point: defaults.default_reorder_point,
    });
    if (error) throw new Error(error.message);
  }
}

export async function deleteInventoryRowForVariant(
  variantId: string,
): Promise<void> {
  await requireAdminOnlyProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("variant_id", variantId);
  if (error) throw new Error(error.message);
}

export async function upsertInventoryStock(
  variantId: string,
  stock: number,
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data: settings, error: storeErr } = await supabase
    .from("app_settings")
    .select("default_store_id")
    .eq("id", 1)
    .maybeSingle();
  if (storeErr) throw new Error(storeErr.message);

  const defaultStoreId = settings?.default_store_id;
  if (!defaultStoreId) {
    throw new Error("No default store configured");
  }

  const { error } = await invokeRpc(supabase, "set_store_inventory_stock", {
    p_store_id: defaultStoreId,
    p_variant_id: variantId,
    p_stock: stock,
  });
  if (error) throw new Error(error.message);
}

export async function updateInventoryReorderSettings(
  variantId: string,
  reorder_point: number,
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("inventory")
    .update({ reorder_point: Math.max(0, Math.floor(reorder_point)) })
    .eq("variant_id", variantId);
  if (error) throw new Error(error.message);
}

/**
 * @deprecated PO delivery does not increase stock. Use ERP purchase bill finalize.
 */
export async function incrementCentralInventoryByLines(
  _lines: { variantId: string; quantity: number }[],
): Promise<void> {
  return;
}
