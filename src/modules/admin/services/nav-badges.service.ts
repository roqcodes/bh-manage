import "server-only";

import type {
  AdminNavBadge,
  AdminNavBadgesPayload,
  AdminNavBadgeTone,
} from "@/common/admin/types";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { countVariantsBelowReorderPoint } from "@/modules/procurement/services/procurement.service";
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
    pendingAssignmentRes,
    pendingTransferRes,
    inventoryHealthRes,
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
      .from("orders")
      .select("id", { count: "exact", head: true })
      .or("source.is.null,source.eq.online")
      .eq("fulfillment_status", "pending_assignment")
      .not("status", "in", "(cancelled,delivered)"),
    supabase
      .from("erp_transfer_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase.from("inventory").select("stock,reorder_point"),
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

  setBadge(
    badges,
    "/admin/erp/fulfillment-queue",
    pendingAssignmentRes.count ?? 0,
    "critical",
  );

  setBadge(
    badges,
    "/admin/erp/transfer-approvals",
    pendingTransferRes.count ?? 0,
    "warning",
  );

  const criticalSkus =
    (inventoryHealthRes.data ?? []).filter((row) => {
      const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
      return stock < 1;
    }).length;
  const lowSkus =
    (inventoryHealthRes.data ?? []).filter((row) => {
      const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
      const reorderPoint = Math.max(0, Math.floor(Number(row.reorder_point ?? 10)));
      return stock >= 1 && stock < reorderPoint;
    }).length;
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
    const reorderCount = await countVariantsBelowReorderPoint();
    setBadge(
      badges,
      "/admin/procurement",
      reorderCount,
      reorderCount > 0 ? "critical" : "info",
    );
  } catch {
    /* RBAC */
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
