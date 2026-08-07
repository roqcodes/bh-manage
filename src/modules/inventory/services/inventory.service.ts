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
  const { error } = await supabase.from("inventory").insert({
    variant_id: variantId,
    stock,
    reorder_point: defaults.default_reorder_point,
  });
  if (error) throw new Error(error.message);
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
  const { error } = await supabase
    .from("inventory")
    .upsert({ variant_id: variantId, stock });
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
 * Adds quantities to central `inventory` (inbound receipt). Used when a vendor PO is marked delivered.
 * Server-only; call only from trusted server code after PO ownership checks.
 */
export async function incrementCentralInventoryByLines(
  lines: { variantId: string; quantity: number }[],
): Promise<void> {
  if (lines.length === 0) return;

  const supabase = await createSupabaseServerClient();
  const merged = new Map<string, number>();
  for (const line of lines) {
    merged.set(
      line.variantId,
      (merged.get(line.variantId) ?? 0) + line.quantity,
    );
  }

  const variantIds = [...merged.keys()];
  const { data: rows, error: readErr } = await supabase
    .from("inventory")
    .select("variant_id,stock")
    .in("variant_id", variantIds);

  if (readErr) throw new Error(readErr.message);

  const stockByVariant = new Map<string, number>();
  for (const r of rows ?? []) {
    const vid = r.variant_id as string;
    stockByVariant.set(
      vid,
      Math.max(0, Math.floor(Number((r as { stock?: number }).stock ?? 0))),
    );
  }

  const upserts = variantIds.map((variantId) => ({
    variant_id: variantId,
    stock: (stockByVariant.get(variantId) ?? 0) + (merged.get(variantId) ?? 0),
  }));

  const { error: writeErr } = await supabase
    .from("inventory")
    .upsert(upserts, { onConflict: "variant_id" });

  if (writeErr) throw new Error(writeErr.message);
}
