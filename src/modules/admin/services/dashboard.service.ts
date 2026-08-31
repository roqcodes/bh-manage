import "server-only";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { formatCurrency } from "@/lib/format-currency";
import { getAppSettings } from "@/modules/settings/services/app-settings.service";
import type {
  AdminDashboardPayload,
  CatalogInventoryCoverage,
  DashboardAlert,
  DashboardErpInvoiceRow,
  DashboardFulfillmentCounts,
  DashboardMetrics,
  DashboardMonthlySeriesPoint,
  Order,
  VendorSnapshotEntry,
} from "@/common/admin/types";
import {
  aggregatePendingOrderDemand,
  getInventoryReorderRows,
  getOpenPurchaseOrderQuantitiesByVariant,
  getProcurementDefaults,
} from "@/modules/procurement/services/procurement.service";
import { computeReorderNeeds } from "@/modules/procurement/procurement.allocate";
import { listRecentAuditLogs } from "@/modules/erp/services/audit-log.service";
import { getFinancialDashboard } from "@/modules/erp/services/erp-finance-dashboard.service";
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

function buildCatalogCoverage(
  productsCountResult: { count: number | null } | null,
  inventoryRows: unknown[] | null | undefined,
): CatalogInventoryCoverage {
  const totalProducts = productsCountResult?.count ?? 0;
  const productIds = new Set<string>();
  for (const row of inventoryRows ?? []) {
    const r = row as {
      product_variants?: { product_id?: string | null } | null;
    };
    const pid = r.product_variants?.product_id;
    if (pid) productIds.add(pid);
  }
  return {
    productsWithStock: productIds.size,
    totalProducts,
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

function buildMonthlySeries(
  invoices: { created_at: string; total_amount: number | null }[],
  bills: { purchase_date: string; total_amount: number | null }[],
  expenses: { expense_date: string; total_amount: number | null }[],
): DashboardMonthlySeriesPoint[] {
  const year = new Date().getFullYear();
  const buckets: DashboardMonthlySeriesPoint[] = MONTH_LABELS.map((month, i) => ({
    month,
    monthNum: i + 1,
    income: 0,
    cogs: 0,
    expenses: 0,
    netProfit: 0,
  }));

  for (const inv of invoices) {
    const d = new Date(inv.created_at);
    if (d.getFullYear() !== year) continue;
    buckets[d.getMonth()].income += Number(inv.total_amount ?? 0);
  }
  for (const bill of bills) {
    const d = new Date(bill.purchase_date);
    if (d.getFullYear() !== year) continue;
    buckets[d.getMonth()].cogs += Number(bill.total_amount ?? 0);
  }
  for (const exp of expenses) {
    const d = new Date(exp.expense_date);
    if (d.getFullYear() !== year) continue;
    buckets[d.getMonth()].expenses += Number(exp.total_amount ?? 0);
  }
  for (const bucket of buckets) {
    bucket.netProfit = bucket.income - bucket.cogs - bucket.expenses;
  }
  return buckets;
}

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

/** One Supabase client + parallel queries for dashboard API (avoids duplicate SSR client setup). */
export async function getAdminDashboardPayload(): Promise<AdminDashboardPayload> {
  const supabase = await createSupabaseServerClient();
  const currencySettings = await getAppSettings();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();
  const yearStart = `${today.getFullYear()}-01-01`;

  const snapshotSince = new Date(today);
  snapshotSince.setDate(snapshotSince.getDate() - 45);
  const snapshotSinceIso = snapshotSince.toISOString();

  const [
    revenueResult,
    unfulfilledResult,
    delayedResult,
    pendingPipe,
    processingPipe,
    shippedPipe,
    deliveredPipe,
    ordersTodayAgg,
    inventoryStockRows,
    recentOrdersForFulfillment,
    vendorPricesRaw,
    purchaseOrdersRaw,
    recentResult,
    pipelineBlock,
    productsCountResult,
    inventoryWithProductRows,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id,total_amount")
      .gte("created_at", startOfDay)
      .neq("status", "cancelled"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing", "shipped"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing", "shipped"])
      .lt("created_at", startOfDay),
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
      .gte("created_at", startOfDay)
      .neq("status", "cancelled"),
    supabase.from("inventory").select("variant_id,stock,reorder_point"),
    supabase
      .from("orders")
      .select("id,status")
      .gte("created_at", snapshotSinceIso),
    supabase
      .from("vendor_products")
      .select("vendor_id, base_price, vendors(id, name)"),
    supabase.from("purchase_orders").select("vendor_id, status"),
    supabase
      .from("orders")
      .select(
        "id,created_at,status,total_amount,fulfillment_status,source,users:users!orders_user_fkey(name,phone)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    (async () => {
      let pipelineDemandUnits = 0;
      let shortageUnits = 0;
      let pipelineShortageVariants = 0;
      try {
        const demandRows = await aggregatePendingOrderDemand();
        pipelineDemandUnits = demandRows.reduce((s, r) => s + r.demand_qty, 0);
        const onOrderByVariant = await getOpenPurchaseOrderQuantitiesByVariant();
        const inventoryRows = await getInventoryReorderRows(onOrderByVariant);
        const defaults = await getProcurementDefaults();
        const reorderNeeds = computeReorderNeeds(
          inventoryRows,
          defaults.default_reorder_quantity,
        );
        shortageUnits = reorderNeeds.reduce((s, r) => s + r.shortage_qty, 0);
        pipelineShortageVariants = reorderNeeds.length;
      } catch {
        /* RBAC or empty */
      }
      return { pipelineDemandUnits, shortageUnits, pipelineShortageVariants };
    })(),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("inventory")
      .select("product_variants(product_id)")
      .gt("stock", 0),
  ]);

  const todayOrders = revenueResult.data ?? [];
  const todayIds = todayOrders.map((o) => o.id as string).filter(Boolean);

  const fulfillmentOrderIds = (recentOrdersForFulfillment.data ?? []).map(
    (r: { id: string }) => r.id,
  );
  const orderStatusById = new Map(
    (recentOrdersForFulfillment.data ?? []).map((r: { id: string; status: string }) => [
      r.id,
      r.status,
    ]),
  );

  const [marginResult, demandItemsResult, fulfillmentItems] = await Promise.all([
    todayIds.length === 0
      ? Promise.resolve({ data: [] as { margin_amount: number | null }[] })
      : supabase
          .from("order_items")
          .select("margin_amount")
          .in("order_id", todayIds),
    todayIds.length === 0
      ? Promise.resolve({ data: [] as { quantity: number | null }[] })
      : supabase.from("order_items").select("quantity").in("order_id", todayIds),
    fulfillmentOrderIds.length === 0
      ? Promise.resolve({
          data: [] as {
            vendor_id: string | null;
            quantity: number | null;
            order_id: string | null;
          }[],
        })
      : supabase
          .from("order_items")
          .select("vendor_id, quantity, order_id")
          .in("order_id", fulfillmentOrderIds)
          .not("vendor_id", "is", null),
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
    const reorderPoint = Math.max(0, Math.floor(Number(row.reorder_point ?? 10)));
    if (stock < 1) outOfStockCount += 1;
    else if (stock < reorderPoint) lowStockItems += 1;
  }
  const productsNeedingRestock = outOfStockCount + lowStockItems;

  const { pipelineDemandUnits, shortageUnits, pipelineShortageVariants } =
    pipelineBlock;

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

  const procurement = {
    pipelineDemandUnits,
    availableInventoryUnits,
    shortageUnits,
    pipelineShortageVariants,
    demandTodayUnits,
    productsNeedingRestock,
  };

  const catalogCoverage = buildCatalogCoverage(
    productsCountResult,
    inventoryWithProductRows.data ?? [],
  );

  const fulfillmentRows = fulfillmentItems.data ?? [];
  const vendorQty = new Map<
    string,
    { fulfilled: number; total: number }
  >();
  for (const row of fulfillmentRows) {
    const vid = row.vendor_id;
    if (!vid) continue;
    const oid = row.order_id;
    const q = Math.max(0, Math.floor(Number(row.quantity ?? 0)));
    const status = oid ? (orderStatusById.get(oid) ?? "") : "";
    const cur = vendorQty.get(vid) ?? { fulfilled: 0, total: 0 };
    cur.total += q;
    if (status === "delivered") cur.fulfilled += q;
    vendorQty.set(vid, cur);
  }

  const fulfillmentEntries: VendorSnapshotEntry[] = [];
  for (const [vendorId, v] of vendorQty) {
    if (v.total === 0) continue;
    const rate = (100 * v.fulfilled) / v.total;
    fulfillmentEntries.push({
      vendorId,
      name: null,
      headline: "Unit fulfillment (45d)",
      value: `${rate.toFixed(0)}% · ${v.fulfilled}/${v.total} units`,
    });
  }

  type VpRow = {
    vendor_id: string | null;
    base_price: number | null;
    vendors: { id?: string; name?: string | null } | null;
  };
  const priceRows = (vendorPricesRaw.data ?? []) as unknown as VpRow[];
  const priceAgg = new Map<string, { sum: number; n: number; name: string | null }>();
  for (const row of priceRows) {
    const vid = row.vendor_id;
    if (!vid) continue;
    const price = Number(row.base_price ?? 0);
    const name = (row.vendors?.name as string | null) ?? null;
    const cur = priceAgg.get(vid) ?? { sum: 0, n: 0, name };
    cur.sum += price;
    cur.n += 1;
    if (name) cur.name = name;
    priceAgg.set(vid, cur);
  }
  const lowestPriceWithAvg = [...priceAgg.entries()].map(
    ([vendorId, { sum, n, name }]) => {
      const avg = sum / Math.max(1, n);
      return {
        vendorId,
        name,
        headline: "Avg. list price",
        value: `${formatCurrency(avg, { maximumFractionDigits: 0 }, currencySettings)} · ${n} SKUs`,
        avg,
      };
    },
  );
  lowestPriceWithAvg.sort((a, b) => a.avg - b.avg);
  const lowestPriceEntries: VendorSnapshotEntry[] = lowestPriceWithAvg.map(
    ({ avg: _avg, ...entry }) => entry,
  );

  type PoRow = { vendor_id: string | null; status: string | null };
  const poRows = (purchaseOrdersRaw.data ?? []) as PoRow[];
  const poAgg = new Map<
    string,
    { delivered: number; total: number }
  >();
  for (const row of poRows) {
    const vid = row.vendor_id;
    if (!vid) continue;
    const cur = poAgg.get(vid) ?? { delivered: 0, total: 0 };
    cur.total += 1;
    if ((row.status ?? "").toLowerCase() === "delivered") cur.delivered += 1;
    poAgg.set(vid, cur);
  }

  const nameByVendor = new Map<string, string | null>();
  for (const row of priceRows) {
    if (row.vendor_id && row.vendors?.name != null) {
      nameByVendor.set(row.vendor_id, row.vendors.name);
    }
  }

  const reliabilityWithRate = [...poAgg.entries()]
    .filter(([, v]) => v.total >= 2)
    .map(([vendorId, v]) => {
      const rate = (100 * v.delivered) / v.total;
      return {
        vendorId,
        name: nameByVendor.get(vendorId) ?? null,
        headline: "Purchase order close rate",
        value: `${rate.toFixed(0)}% · ${v.delivered}/${v.total} POs`,
        rate,
      };
    });
  reliabilityWithRate.sort((a, b) => b.rate - a.rate);
  const reliabilityEntries: VendorSnapshotEntry[] = reliabilityWithRate.map(
    ({ rate: _rate, ...entry }) => entry,
  );

  for (const e of fulfillmentEntries) {
    e.name = nameByVendor.get(e.vendorId) ?? e.name;
  }
  fulfillmentEntries.sort((a, b) => {
    const ra = Number(a.value.match(/^([\d.]+)/)?.[1]) || 0;
    const rb = Number(b.value.match(/^([\d.]+)/)?.[1]) || 0;
    return rb - ra;
  });

  const vendors = buildVendorSnapshot(
    fulfillmentEntries,
    lowestPriceEntries,
    reliabilityEntries,
  );

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

  try {
    const [
      financial,
      activity,
      yearInvoices,
      yearBills,
      yearExpenses,
      recentInvoicesRaw,
      erpInvoicesTodayResult,
      fulfillPending,
      fulfillReady,
      fulfillShipped,
    ] = await Promise.all([
      getFinancialDashboard(),
      listRecentAuditLogs(15),
      supabase
        .from("invoices")
        .select("created_at, total_amount")
        .gte("created_at", `${yearStart}T00:00:00`)
        .in("status", ["issued", "partial", "paid"]),
      supabase
        .from("erp_purchase_bills")
        .select("purchase_date, total_amount")
        .gte("purchase_date", yearStart)
        .in("status", ["finalized", "partial", "paid"]),
      supabase
        .from("erp_expenses")
        .select("expense_date, total_amount")
        .gte("expense_date", yearStart),
      supabase
        .from("invoices")
        .select("id, invoice_number, user_id, total_amount, created_at, status")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay)
        .in("status", ["issued", "partial", "paid"]),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("fulfillment_status", "pending_assignment")
        .not("status", "eq", "cancelled"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("fulfillment_status", [
          "reserved",
          "multi_shipment",
          "partially_shipped",
        ])
        .not("status", "eq", "cancelled"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "shipped"),
    ]);

    erpFinancial = financial;
    erpActivity = activity;
    erpMonthlySeries = buildMonthlySeries(
      yearInvoices.data ?? [],
      yearBills.data ?? [],
      yearExpenses.data ?? [],
    );
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
  } catch {
    erpFinancial = null;
    erpActivity = [];
  }

  return {
    metrics,
    alerts,
    pipeline,
    business,
    procurement,
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
