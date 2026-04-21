import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  Order,
  OrderCatalogStats,
  OrderStatusFilter,
  OrderWithItems,
  Paginated,
} from "@/common/admin/types";
import { PAGE_SIZE } from "@/common/admin/types";

export interface OrderFilterUserRow {
  id: string;
  name: string | null;
  email: string | null;
}

export async function getOrders(
  status: OrderStatusFilter = "all",
  userId: string | null = null,
  page = 0,
): Promise<Paginated<Order>> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  let query = supabase
    .from("orders")
    .select(
      "id,created_at,status,total_amount,users:users!orders_user_id_fkey(id,name,email,phone)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status !== "all") query = query.eq("status", status);
  if (userId) query = query.eq("user_id", userId);

  const { data, count } = await query;

  return {
    data: (data ?? []) as unknown as Order[],
    total: count ?? 0,
  };
}

export async function getOrdersCatalogStats(): Promise<OrderCatalogStats> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const [
    totalRes,
    pendingRes,
    processingRes,
    shippedRes,
    deliveredRes,
    cancelledRes,
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "shipped"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled"),
  ]);

  return {
    totalOrders: totalRes.count ?? 0,
    pendingCount: pendingRes.count ?? 0,
    processingCount: processingRes.count ?? 0,
    shippedCount: shippedRes.count ?? 0,
    deliveredCount: deliveredRes.count ?? 0,
    cancelledCount: cancelledRes.count ?? 0,
  };
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id,created_at,status,payment_status,total_amount,users:users!orders_user_id_fkey(id,name,email,phone),order_items(id,order_id,variant_id,quantity,price,product_name,vendor_id,base_price,final_price,margin_amount,created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  return data as unknown as OrderWithItems | null;
}

export async function listUsersForOrderFilter(): Promise<OrderFilterUserRow[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("users")
    .select("id,name,email")
    .order("name", { ascending: true })
    .limit(500);

  return (data ?? []) as OrderFilterUserRow[];
}

export async function updateOrderStatusById(
  orderId: string,
  status: string,
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}
