import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  AdminPurchaseOrderDetail,
  AdminPurchaseOrderListRow,
  Paginated,
  PurchaseOrderCatalogStats,
  PurchaseOrderStatusFilter,
} from "@/common/admin/types";
import { PAGE_SIZE } from "@/common/admin/types";

export async function listAdminPurchaseOrders(
  status: PurchaseOrderStatusFilter,
  page = 0,
  vendorId: string | null = null,
): Promise<Paginated<AdminPurchaseOrderListRow>> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  let query = supabase
    .from("purchase_orders")
    .select("id,vendor_id,status,total_amount,created_at,vendors(name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status !== "all") query = query.eq("status", status);
  if (vendorId) query = query.eq("vendor_id", vendorId);

  const { data, count, error } = await query;

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as unknown as AdminPurchaseOrderListRow[],
    total: count ?? 0,
  };
}

export async function getPurchaseOrderCatalogStats(): Promise<PurchaseOrderCatalogStats> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const [
    totalRes,
    pendingRes,
    acceptedRes,
    deliveredRes,
    cancelledRes,
  ] = await Promise.all([
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted"),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered"),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled"),
  ]);

  return {
    totalPurchaseOrders: totalRes.count ?? 0,
    pendingCount: pendingRes.count ?? 0,
    acceptedCount: acceptedRes.count ?? 0,
    deliveredCount: deliveredRes.count ?? 0,
    cancelledCount: cancelledRes.count ?? 0,
  };
}

export async function getAdminPurchaseOrderById(
  id: string,
): Promise<AdminPurchaseOrderDetail | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "id,vendor_id,status,total_amount,created_at,vendors(id,name,contact),purchase_order_items(id,variant_id,quantity,price,product_variants(id,name,products(id,name)))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return data as unknown as AdminPurchaseOrderDetail;
}

/**
 * Admin may cancel a PO only while it is still pending (before vendor acceptance).
 */
export async function cancelAdminPurchaseOrder(poId: string): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", poId)
    .eq("status", "pending")
    .select("id");

  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error(
      "Purchase order could not be cancelled (must be pending).",
    );
  }
}
