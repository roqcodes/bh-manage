import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ItemTransactionRow } from "@/common/erp/inventory-types";
import { getAdminErpContext } from "@/modules/erp/services/store-context.service";

export interface ItemTransactionFilters {
  storeId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listItemTransactions(
  filters: ItemTransactionFilters = {},
): Promise<{ data: ItemTransactionRow[]; total: number }> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const ctx = await getAdminErpContext();
  const page = filters.page ?? 0;
  const limit = filters.limit ?? 50;
  const from = page * limit;
  const storeId = filters.storeId ?? ctx?.store_id;

  let query = supabase
    .from("stock_movements")
    .select(
      "id, created_at, store_id, transfer_store_id, type, variant_id, quantity, transaction_price, balance_after, reference_id, reference_type, reason",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (storeId) query = query.eq("store_id", storeId);
  if (filters.type && filters.type !== "all") query = query.eq("type", filters.type);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const variantIds = [...new Set((data ?? []).map((r) => r.variant_id))];
  const storeIds = new Set<string>();
  for (const row of data ?? []) {
    if (row.store_id) storeIds.add(row.store_id);
    if (row.transfer_store_id) storeIds.add(row.transfer_store_id);
  }

  const variantMap = new Map<string, { product_name: string; variant_name: string | null; barcode: string | null }>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, name, barcode, products(name)")
      .in("id", variantIds);
    for (const v of variants ?? []) {
      const product = v.products as { name: string } | null;
      variantMap.set(v.id, {
        product_name: product?.name ?? "—",
        variant_name: v.name,
        barcode: v.barcode,
      });
    }
  }

  const storeMap = new Map<string, string>();
  if (storeIds.size > 0) {
    const { data: stores } = await supabase.from("stores").select("id, name").in("id", [...storeIds]);
    for (const s of stores ?? []) storeMap.set(s.id, s.name);
  }

  const invoiceIds = (data ?? [])
    .filter((r) => r.reference_type === "invoice" && r.reference_id)
    .map((r) => r.reference_id as string);
  const invoiceMap = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .in("id", invoiceIds);
    for (const inv of invoices ?? []) invoiceMap.set(inv.id, inv.invoice_number);
  }

  let rows: ItemTransactionRow[] = (data ?? []).map((row) => {
    const variant = variantMap.get(row.variant_id);
    return {
      id: row.id,
      created_at: row.created_at,
      store_id: row.store_id,
      store_name: row.store_id ? (storeMap.get(row.store_id) ?? null) : null,
      transfer_store_id: row.transfer_store_id,
      transfer_store_name: row.transfer_store_id
        ? (storeMap.get(row.transfer_store_id) ?? null)
        : null,
      type: row.type,
      variant_id: row.variant_id,
      product_name: variant?.product_name ?? "—",
      variant_name: variant?.variant_name ?? null,
      barcode: variant?.barcode ?? null,
      quantity: Number(row.quantity ?? 0),
      transaction_price: row.transaction_price != null ? Number(row.transaction_price) : null,
      balance_after: row.balance_after != null ? Number(row.balance_after) : null,
      reference_id: row.reference_id,
      reference_type: row.reference_type,
      reason: row.reason,
      invoice_number:
        row.reference_type === "invoice" && row.reference_id
          ? (invoiceMap.get(row.reference_id) ?? null)
          : null,
    };
  });

  if (filters.search?.trim()) {
    const s = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.product_name.toLowerCase().includes(s) ||
        (r.variant_name?.toLowerCase().includes(s) ?? false) ||
        (r.barcode?.toLowerCase().includes(s) ?? false) ||
        (r.invoice_number?.toLowerCase().includes(s) ?? false) ||
        r.type.toLowerCase().includes(s),
    );
  }

  return { data: rows, total: count ?? 0 };
}
