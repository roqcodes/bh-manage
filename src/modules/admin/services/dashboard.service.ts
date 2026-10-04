import "server-only";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  AdminDashboardPayload,
  CatalogInventoryCoverage,
  DashboardAlert,
  DashboardChartGranularity,
  DashboardErpInvoiceRow,
  DashboardFulfillmentCounts,
  DashboardMetrics,
  DashboardMonthlySeriesPoint,
  InventoryInsights,
  Order,
  VendorSnapshotEntry,
} from "@/common/admin/types";
import { listAuditLogs } from "@/modules/erp/services/audit-log.service";
import {
  buildStorePlSeries,
  getStoreFinancialDashboard,
} from "@/modules/erp/services/erp-finance-dashboard.service";
import { requireErpStoreId } from "@/modules/erp/services/store-context.service";
import type { ErpFinancialDashboard } from "@/common/erp/finance-types";
import type { AuditLogEntry } from "@/common/erp/types";

function sortAlertsBySeverity(alerts: DashboardAlert[]): DashboardAlert[] {
  const rank: Record<string, number> = { critical: 0, warning: 1, attention: 2 };
  return [...alerts].sort(
    (a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9),
  );
}

function buildVendorSnapshot(
  fulfillment: VendorSnapshotEntry[],
  lowestPrice: VendorSnapshotEntry[],
  reliability: VendorSnapshotEntry[],
): AdminDashboardPayload["vendors"] {
  return {
    topByFulfillment: fulfillment.slice(0, 3),
    lowestAvgPrice: lowestPrice.slice(0, 3),
    topByPoReliability: reliability.slice(0, 3),
  };
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;


async function loadInvoiceCustomerNames(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userIds: string[],
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const nameById = new Map<string, string | null>();
  if (uniqueIds.length === 0) return nameById;

  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .in("id", uniqueIds);
  if (error) return nameById;

  for (const user of data ?? []) {
    nameById.set(user.id, user.name);
  }
  return nameById;
}

/** One Supabase client + parallel queries for dashboard API (branch-scoped). */
export async function getAdminDashboardPayload(
  storeId?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  granularity: DashboardChartGranularity = "month",
): Promise<AdminDashboardPayload> {
  const supabase = await createSupabaseServerClient();
  const activeStoreId = await requireErpStoreId(storeId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const periodFrom = dateFrom?.trim() || `${year}-01-01`;
  const periodTo = dateTo?.trim() || today.toISOString().slice(0, 10);
  const startOfDay = today.toISOString();

  const erpExtendedPromise = Promise.all([
    getStoreFinancialDashboard(activeStoreId, periodFrom, periodTo),
    listAuditLogs({ storeId: activeStoreId, limit: 15 }),
    supabase
      .from("invoices")
      .select("id, invoice_number, user_id, total_amount, created_at, status")
      .eq("store_id", activeStoreId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .gte("created_at", startOfDay)
      .in("status", ["issued", "partial", "paid"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .eq("fulfillment_status", "pending_assignment")
      .not("status", "eq", "cancelled"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .in("fulfillment_status", [
        "reserved",
        "multi_shipment",
        "partially_shipped",
      ])
      .not("status", "eq", "cancelled"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .eq("status", "shipped"),
    buildStorePlSeries(activeStoreId, periodFrom, periodTo, granularity),
  ]).catch(() => null);

  const [
    storeRowResult,
    revenueResult,
    unfulfilledResult,
    delayedResult,
    pendingPipe,
    processingPipe,
    shippedPipe,
    deliveredPipe,
    ordersTodayAgg,
    inventoryStockRows,
    recentResult,
    erpExtendedResult,
  ] = await Promise.all([
    supabase.from("stores").select("name").eq("id", activeStoreId).maybeSingle(),
    supabase
      .from("orders")
      .select("id,total_amount")
      .eq("store_id", activeStoreId)
      .gte("created_at", startOfDay)
      .neq("status", "cancelled"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .in("status", ["pending", "processing", "shipped"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .in("status", ["pending", "processing", "shipped"])
      .lt("created_at", startOfDay),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .eq("status", "processing"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .eq("status", "shipped"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .eq("status", "delivered"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", activeStoreId)
      .gte("created_at", startOfDay)
      .neq("status", "cancelled"),
    supabase
      .from("store_product_inventory")
      .select("stock")
      .eq("store_id", activeStoreId),
    supabase
      .from("orders")
      .select(
        "id,created_at,status,total_amount,fulfillment_status,source,users:users!orders_user_fkey(name,phone)",
      )
      .eq("store_id", activeStoreId)
      .order("created_at", { ascending: false })
      .limit(8),
    erpExtendedPromise,
  ]);

  const storeName = storeRowResult.data?.name ?? "Store";

  const todayOrders = revenueResult.data ?? [];
  const todayIds = todayOrders.map((o) => o.id as string).filter(Boolean);

  const [marginResult, demandItemsResult] = await Promise.all([
    todayIds.length === 0
      ? Promise.resolve({ data: [] as { margin_amount: number | null }[] })
      : supabase
          .from("order_items")
          .select("margin_amount")
          .in("order_id", todayIds),
    todayIds.length === 0
      ? Promise.resolve({ data: [] as { quantity: number | null }[] })
      : supabase.from("order_items").select("quantity").in("order_id", todayIds),
  ]);

  const dailyRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0,
  );

  const ordersToday = ordersTodayAgg.count ?? 0;
  const averageOrderValue =
    ordersToday > 0 ? dailyRevenue / ordersToday : 0;

  const marginRows = marginResult.data ?? [];
  const marginToday = marginRows.reduce(
    (sum, row) => sum + Number(row.margin_amount ?? 0),
    0,
  );

  const demandItems = demandItemsResult.data ?? [];
  const demandTodayUnits = demandItems.reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row.quantity ?? 0))),
    0,
  );

  const stockRows = inventoryStockRows.data ?? [];
  const availableInventoryUnits = stockRows.reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row.stock ?? 0))),
    0,
  );

  let outOfStockCount = 0;
  let lowStockItems = 0;
  for (const row of stockRows) {
    const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
    if (stock < 1) outOfStockCount += 1;
    else if (stock < 10) lowStockItems += 1;
  }
  const productsNeedingRestock = outOfStockCount + lowStockItems;

  const inventory: InventoryInsights = {
    availableInventoryUnits,
    productsNeedingRestock,
    demandTodayUnits,
    outOfStockSkus: outOfStockCount,
    lowStockSkus: lowStockItems,
  };

  const metrics: DashboardMetrics = {
    dailyRevenue,
    pendingOrders: pendingPipe.count ?? 0,
    lowStockItems,
  };

  const pipeline = {
    pending: pendingPipe.count ?? 0,
    processing: processingPipe.count ?? 0,
    shipped: shippedPipe.count ?? 0,
    delivered: deliveredPipe.count ?? 0,
  };

  const alerts: DashboardAlert[] = sortAlertsBySeverity([
    {
      id: "out-of-stock",
      label: "Out of stock SKUs",
      count: outOfStockCount,
      severity: "critical",
      href: "/admin/inventory",
    },
    {
      id: "delayed",
      label: "Delayed orders (open from prior days)",
      count: delayedResult.count ?? 0,
      severity: "critical",
      href: "/admin/orders",
    },
    {
      id: "low-stock",
      label: "Low stock SKUs",
      count: lowStockItems,
      severity: "warning",
      href: "/admin/inventory",
    },
    {
      id: "unfulfilled",
      label: "Unfulfilled orders (in flight)",
      count: unfulfilledResult.count ?? 0,
      severity: "attention",
      href: "/admin/orders",
    },
  ]);

  const business = {
    revenueToday: dailyRevenue,
    marginToday,
    ordersToday,
    averageOrderValue,
  };

  // Vendor snapshot + global catalog coverage are not rendered on the store dashboard UI.
  const catalogCoverage: CatalogInventoryCoverage = {
    productsWithStock: 0,
    totalProducts: 0,
  };
  const vendors = buildVendorSnapshot([], [], []);

  let erpFinancial: ErpFinancialDashboard | null = null;
  let erpActivity: AuditLogEntry[] = [];
  let erpMonthlySeries: DashboardMonthlySeriesPoint[] = MONTH_LABELS.map(
    (month, i) => ({
      month,
      monthNum: i + 1,
      income: 0,
      cogs: 0,
      expenses: 0,
      netProfit: 0,
    }),
  );
  let recentErpInvoices: DashboardErpInvoiceRow[] = [];
  let erpInvoicesToday = 0;
  let fulfillmentCounts: DashboardFulfillmentCounts = {
    needsAssignment: 0,
    readyToShip: 0,
    shipped: 0,
    delivered: deliveredPipe.count ?? 0,
  };

  if (erpExtendedResult) {
    const [
      financial,
      activityResult,
      recentInvoicesRaw,
      erpInvoicesTodayResult,
      fulfillPending,
      fulfillReady,
      fulfillShipped,
      erpMonthlySeriesData,
    ] = erpExtendedResult;

    erpFinancial = financial;
    erpActivity = activityResult.data;
    erpMonthlySeries = erpMonthlySeriesData;
    erpInvoicesToday = erpInvoicesTodayResult.count ?? 0;
    fulfillmentCounts = {
      needsAssignment: fulfillPending.count ?? 0,
      readyToShip: fulfillReady.count ?? 0,
      shipped: fulfillShipped.count ?? 0,
      delivered: deliveredPipe.count ?? 0,
    };

    const invoiceRows = recentInvoicesRaw.data ?? [];
    const customerNames = await loadInvoiceCustomerNames(
      supabase,
      invoiceRows.map((row) => row.user_id),
    );
    recentErpInvoices = invoiceRows.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      total_amount: Number(row.total_amount ?? 0),
      created_at: row.created_at,
      customer_name: customerNames.get(row.user_id) ?? null,
      status: row.status,
    }));
  }

  return {
    storeId: activeStoreId,
    storeName,
    periodFrom,
    periodTo,
    chartGranularity: granularity,
    metrics,
    alerts,
    pipeline,
    business,
    inventory,
    catalogCoverage,
    vendors,
    recentOrders: (recentResult.data ?? []) as unknown as Order[],
    erpFinancial,
    erpActivity,
    erpMonthlySeries,
    recentErpInvoices,
    erpInvoicesToday,
    fulfillmentCounts,
  };
}
