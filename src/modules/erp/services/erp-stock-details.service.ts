import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { StockDetailRow } from "@/common/erp/inventory-types";
import { resolveErpStoreId } from "@/modules/erp/services/store-context.service";

export async function getStockDetails(input?: {
  storeId?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: StockDetailRow[]; total: number }> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveErpStoreId(input?.storeId);
  const page = input?.page ?? 0;
  const limit = input?.limit ?? 50;
  const from = page * limit;

  if (storeId) {
    const { data: siRows, error, count } = await supabase
      .from("store_inventory")
      .select("variant_id, stock, purchase_price, sales_price", { count: "exact" })
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error(error.message);

    const variantIds = (siRows ?? []).map((r) => r.variant_id);
    const variantMap = new Map<string, {
      name: string | null;
      barcode: string | null;
      price: number | null;
      purchase_price: number | null;
      product_name: string;
    }>();
    const centralMap = new Map<string, number>();

    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, name, barcode, price, purchase_price, products(name)")
        .in("id", variantIds);
      for (const pv of variants ?? []) {
        const product = pv.products as { name: string } | null;
        variantMap.set(pv.id, {
          name: pv.name,
          barcode: pv.barcode,
          price: pv.price != null ? Number(pv.price) : null,
          purchase_price: pv.purchase_price != null ? Number(pv.purchase_price) : null,
          product_name: product?.name ?? "—",
        });
      }

      const { data: centralRows } = await supabase
        .from("inventory")
        .select("variant_id, stock")
        .in("variant_id", variantIds);
      for (const row of centralRows ?? []) {
        centralMap.set(row.variant_id, Number(row.stock ?? 0));
      }
    }

    const data: StockDetailRow[] = (siRows ?? []).map((row) => {
      const pv = variantMap.get(row.variant_id);
      return {
        variant_id: row.variant_id,
        product_name: pv?.product_name ?? "—",
        variant_name: pv?.name ?? null,
        central_stock: centralMap.get(row.variant_id) ?? 0,
        store_stock: Number(row.stock ?? 0),
        purchase_price: row.purchase_price != null ? Number(row.purchase_price) : pv?.purchase_price ?? null,
        sales_price: row.sales_price != null ? Number(row.sales_price) : pv?.price ?? null,
        barcode: pv?.barcode ?? null,
      };
    });

    return { data, total: count ?? 0 };
  }

  const { data: invRows, error, count } = await supabase
    .from("inventory")
    .select("variant_id, stock", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(error.message);

  const variantIds = (invRows ?? []).map((r) => r.variant_id);
  const variantMap = new Map<string, {
    name: string | null;
    barcode: string | null;
    price: number | null;
    purchase_price: number | null;
    product_name: string;
  }>();

  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, name, barcode, price, purchase_price, products(name)")
      .in("id", variantIds);

    for (const pv of variants ?? []) {
      const product = pv.products as { name: string } | null;
      variantMap.set(pv.id, {
        name: pv.name,
        barcode: pv.barcode,
        price: pv.price != null ? Number(pv.price) : null,
        purchase_price: pv.purchase_price != null ? Number(pv.purchase_price) : null,
        product_name: product?.name ?? "—",
      });
    }
  }

  const data: StockDetailRow[] = (invRows ?? []).map((row) => {
    const pv = variantMap.get(row.variant_id);
    return {
      variant_id: row.variant_id,
      product_name: pv?.product_name ?? "—",
      variant_name: pv?.name ?? null,
      central_stock: Number(row.stock ?? 0),
      store_stock: null,
      purchase_price: pv?.purchase_price ?? null,
      sales_price: pv?.price ?? null,
      barcode: pv?.barcode ?? null,
    };
  });

  return { data, total: count ?? 0 };
}

export async function getStoreStockForVariant(
  storeId: string,
  variantId: string,
): Promise<number> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_inventory")
    .select("stock")
    .eq("store_id", storeId)
    .eq("variant_id", variantId)
    .maybeSingle();
  return Number(data?.stock ?? 0);
}
