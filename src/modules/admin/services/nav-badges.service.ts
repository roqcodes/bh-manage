import "server-only";

import type {
  AdminNavBadge,
  AdminNavBadgesPayload,
  AdminNavBadgeTone,
} from "@/common/admin/types";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import {
  aggregatePendingOrderDemand,
  getInventoryStockForVariants,
} from "@/modules/procurement/services/procurement.service";
import { computeShortages } from "@/modules/procurement/procurement.allocate";
import { getPendingPortalRequestCount } from "@/modules/users/services/users.service";

function setBadge(
  badges: Record<string, AdminNavBadge>,
  href: string,
  count: number,
  tone: AdminNavBadgeTone,
) {
  if (count <= 0) return;
  badges[href] = { count, tone };
}

/** Lightweight counts for sidebar attention pills. */
export async function getAdminNavBadges(): Promise<AdminNavBadgesPayload> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  const [
    pendingOrdersRes,
    delayedOrdersRes,
    criticalInventoryRes,
    lowInventoryRes,
    pendingPoRes,
    pendingUsersRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing", "shipped"])
      .lt("created_at", startOfDay),
    supabase
      .from("inventory")
      .select("variant_id", { count: "exact", head: true })
      .or("stock.is.null,stock.lt.1"),
    supabase
      .from("inventory")
      .select("variant_id", { count: "exact", head: true })
      .gte("stock", 1)
      .lt("stock", 10),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    getPendingPortalRequestCount(),
  ]);

  const badges: Record<string, AdminNavBadge> = {};

  const pendingOrders = pendingOrdersRes.count ?? 0;
  const delayedOrders = delayedOrdersRes.count ?? 0;
  const ordersCount = pendingOrders || delayedOrders;
  const ordersTone: AdminNavBadgeTone =
    delayedOrders > 0 ? "critical" : "warning";
  setBadge(badges, "/admin/orders", ordersCount, ordersTone);

  const criticalSkus = criticalInventoryRes.count ?? 0;
  const lowSkus = lowInventoryRes.count ?? 0;
  const inventoryCount = criticalSkus + lowSkus;
  const inventoryTone: AdminNavBadgeTone =
    criticalSkus > 0 ? "critical" : lowSkus > 0 ? "warning" : "info";
  setBadge(badges, "/admin/inventory", inventoryCount, inventoryTone);

  setBadge(
    badges,
    "/admin/purchase-orders",
    pendingPoRes.count ?? 0,
    "warning",
  );

  setBadge(badges, "/admin/users", pendingUsersRes, "warning");

  try {
    const demandRows = await aggregatePendingOrderDemand();
    const variantIds = demandRows.map((r) => r.variant_id);
    const stockMap = await getInventoryStockForVariants(variantIds);
    const demand = new Map(demandRows.map((d) => [d.variant_id, d.demand_qty]));
    const shortages = computeShortages(demand, stockMap);
    setBadge(
      badges,
      "/admin/procurement",
      shortages.length,
      shortages.length > 0 ? "critical" : "info",
    );
  } catch {
    /* empty demand or RBAC */
  }

  const dashboardAlerts = Object.entries(badges).filter(
    ([href]) => href !== "/admin",
  );
  if (dashboardAlerts.length > 0) {
    const hasCritical = dashboardAlerts.some(([, b]) => b.tone === "critical");
    setBadge(
      badges,
      "/admin",
      dashboardAlerts.length,
      hasCritical ? "critical" : "warning",
    );
  }

  return { badges };
}
