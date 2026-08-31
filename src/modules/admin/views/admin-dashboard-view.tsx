"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ChevronRight,
  FileText,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  AdminDashboardPayload,
  DashboardAlert,
  DashboardErpInvoiceRow,
  DashboardMonthlySeriesPoint,
  Order,
} from "@/common/admin/types";
import type { AuditLogEntry } from "@/common/erp/types";
import { formatAuditLogUserDetail } from "@/modules/erp/lib/audit-log-display";
import type { ErpFinancialDashboard } from "@/common/erp/finance-types";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { CurrencyAmount } from "@/components/currency-amount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrencyAmount,
  formatCurrencyCompactAmount,
} from "@/lib/format-currency";
import { useCurrencySettings } from "@/modules/settings/providers/currency-settings-provider";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import { inventoryFulfillmentLabel } from "@/modules/orders/components/orders-ui";

const CHART_INCOME = "hsl(var(--primary))";
const CHART_COGS = "#38bdf8";
const CHART_EXPENSE = "#f59e0b";
const CHART_PROFIT = "#22c55e";
const CHART_LOSS = "#ef4444";

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  issued: "hsl(var(--primary))",
  partial: "#f59e0b",
  paid: "#22c55e",
  cancelled: "#ef4444",
  void: "#64748b",
};

function fmtMoney(n: number, settings: ReturnType<typeof useCurrencySettings>["settings"]) {
  return formatCurrencyCompactAmount(n, settings);
}

function ChartMoneyTooltip({
  active,
  payload,
  label,
  settings,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  settings: ReturnType<typeof useCurrencySettings>["settings"];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="tabular-nums text-muted-foreground">
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {formatCurrencyAmount(Number(entry.value ?? 0), undefined, settings)}
        </p>
      ))}
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cash flow, store sales, online orders, fulfillment, and inventory — current year.
        </p>
      </div>
      <Link
        href="/admin/erp/reports"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        Open reports
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function AlertStrip({ alerts }: { alerts: DashboardAlert[] }) {
  const visible = alerts.filter((a) => a.count > 0);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((alert) => (
        <Link
          key={alert.id}
          href={alert.href}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-muted ${
            alert.severity === "critical"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : alert.severity === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-sky-200 bg-sky-50 text-sky-900"
          }`}
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          {alert.count.toLocaleString()} {alert.label}
          <ChevronRight className="size-3.5 opacity-60" />
        </Link>
      ))}
    </div>
  );
}

function KpiTile({
  label,
  value,
  href,
  negative,
}: {
  label: string;
  value: string;
  href: string;
  negative?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-lg border bg-card px-3 py-3 transition hover:border-primary/30 hover:bg-muted/40"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`mt-2 text-lg font-semibold tabular-nums ${
          negative ? "text-rose-600" : "text-foreground"
        }`}
      >
        {value}
      </span>
      <span className="mt-1 text-[10px] text-primary opacity-0 transition group-hover:opacity-100">
        View details →
      </span>
    </Link>
  );
}

function ErpKpiStack({
  erp,
  settings,
}: {
  erp: ErpFinancialDashboard | null;
  settings: ReturnType<typeof useCurrencySettings>["settings"];
}) {
  const netProfit = erp?.net_profit_ytd ?? 0;
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
      <KpiTile
        label="Net profit / loss"
        value={fmtMoney(netProfit, settings)}
        href="/admin/erp/reports/profit-and-loss"
        negative={netProfit < 0}
      />
      <KpiTile
        label="Net income"
        value={fmtMoney(erp?.net_income_ytd ?? 0, settings)}
        href="/admin/erp/reports/finance-summary"
      />
      <KpiTile
        label="Accounts payable"
        value={fmtMoney(erp?.accounts_payable ?? 0, settings)}
        href="/admin/erp/reports/vendor-balance"
        negative={(erp?.accounts_payable ?? 0) < 0}
      />
      <KpiTile
        label="Accounts receivable"
        value={fmtMoney(erp?.accounts_receivable ?? 0, settings)}
        href="/admin/erp/reports/customer-balance"
      />
      <KpiTile
        label="Low stock items"
        value={(erp?.low_stock_count ?? 0).toLocaleString()}
        href="/admin/erp/reports/item-stock"
      />
    </div>
  );
}

function IncomeCogsChart({
  series,
  erp,
  settings,
}: {
  series: DashboardMonthlySeriesPoint[];
  erp: ErpFinancialDashboard | null;
  settings: ReturnType<typeof useCurrencySettings>["settings"];
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Income vs cost of goods sold</CardTitle>
        <p className="text-xs text-muted-foreground">Monthly totals for the current year</p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_INCOME} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART_INCOME} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cogsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COGS} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COGS} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCurrencyCompactAmount(Number(v), settings)}
              />
              <Tooltip content={<ChartMoneyTooltip settings={settings} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke={CHART_INCOME}
                fill="url(#incomeFill)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cogs"
                name="COGS"
                stroke={CHART_COGS}
                fill="url(#cogsFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-center">
          <Link href="/admin/erp/reports/finance-summary" className="hover:underline">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Total income YTD
            </p>
            <p className="text-base font-semibold tabular-nums text-primary">
              {fmtMoney(erp?.net_income_ytd ?? 0, settings)}
            </p>
          </Link>
          <Link href="/admin/erp/purchase-bills" className="hover:underline">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Total COGS YTD
            </p>
            <p className="text-base font-semibold tabular-nums">
              {fmtMoney(erp?.cogs_ytd ?? 0, settings)}
            </p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceStatusDonut({
  data,
  settings,
}: {
  data: ErpFinancialDashboard["invoice_status_ytd"] | undefined;
  settings: ReturnType<typeof useCurrencySettings>["settings"];
}) {
  const rows = (data ?? []).map((row) => ({
    name: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    status: row.status,
    count: row.count,
    total: row.total,
  }));
  const totalCount = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Invoices this year</CardTitle>
        <p className="text-xs text-muted-foreground">By status</p>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          {rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No invoices yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                >
                  {rows.map((row) => (
                    <Cell
                      key={row.status}
                      fill={INVOICE_STATUS_COLORS[row.status] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const row = item.payload as { total: number; count: number };
                    return [
                      `${value} invoices · ${formatCurrencyAmount(row.total, undefined, settings)}`,
                      item.name,
                    ];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <Link
          href="/admin/erp/invoices"
          className="mt-2 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm hover:bg-muted"
        >
          <span>{totalCount.toLocaleString()} invoices YTD</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </CardContent>
    </Card>
  );
}

function NetProfitChart({
  series,
  settings,
}: {
  series: DashboardMonthlySeriesPoint[];
  settings: ReturnType<typeof useCurrencySettings>["settings"];
}) {
  const chartData = series.map((row) => ({
    ...row,
    fill: row.netProfit >= 0 ? CHART_PROFIT : CHART_LOSS,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Net profit / loss</CardTitle>
          <p className="text-xs text-muted-foreground">By month</p>
        </div>
        <Link
          href="/admin/erp/reports/profit-and-loss"
          className="text-xs text-primary hover:underline"
        >
          Full P&amp;L
        </Link>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCurrencyCompactAmount(Number(v), settings)}
              />
              <Tooltip content={<ChartMoneyTooltip settings={settings} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="netProfit" name="Net profit" radius={[4, 4, 0, 0]}>
                {chartData.map((row) => (
                  <Cell key={row.month} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DailySalesPanel({
  invoices,
  erpInvoicesToday,
  onlineOrdersToday,
  onlineRevenueToday,
}: {
  invoices: DashboardErpInvoiceRow[];
  erpInvoicesToday: number;
  onlineOrdersToday: number;
  onlineRevenueToday: number;
}) {
  const salesToday = erpInvoicesToday + onlineOrdersToday;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Daily sales</CardTitle>
          <p className="text-xs text-muted-foreground">Store invoices &amp; online orders</p>
        </div>
        <Badge variant="secondary">{salesToday} today</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Link
            href="/admin/erp/invoices"
            className="rounded-md border px-2.5 py-2 hover:bg-muted"
          >
            <span className="text-muted-foreground">Store invoices</span>
            <p className="font-semibold tabular-nums">{erpInvoicesToday}</p>
          </Link>
          <Link
            href="/admin/orders"
            className="rounded-md border px-2.5 py-2 hover:bg-muted"
          >
            <span className="text-muted-foreground">Online orders</span>
            <p className="font-semibold tabular-nums">
              {onlineOrdersToday}
              {onlineRevenueToday > 0 ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  · <CurrencyAmount amount={onlineRevenueToday} compact />
                </span>
              ) : null}
            </p>
          </Link>
        </div>
        <ul className="max-h-[240px] space-y-1 overflow-y-auto">
          {invoices.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">No recent invoices</li>
          ) : (
            invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/admin/erp/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {inv.customer_name ?? "Walk-in customer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.invoice_number} · {format(new Date(inv.created_at), "dd MMM, h:mm a")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    <CurrencyAmount amount={inv.total_amount} compact />
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
        <Link
          href="/admin/erp/invoices"
          className="flex w-full items-center justify-center gap-1 rounded-md border py-2 text-sm font-medium text-primary hover:bg-muted"
        >
          Show more
          <ChevronRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

function ActivityLogPanel({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          <p className="text-xs text-muted-foreground">ERP actions</p>
        </div>
        <Link
          href="/admin/erp/reports/activity-logs"
          className="text-xs text-primary hover:underline"
        >
          All logs
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="max-h-[320px] space-y-0 overflow-y-auto">
          {entries.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">No activity yet</li>
          ) : (
            entries.map((entry) => (
              <li
                key={entry.id}
                className="border-l-2 border-primary/20 py-2 pl-3 first:pt-0"
              >
                <p className="text-sm font-medium capitalize">
                  {entry.action.replace(/_/g, " ")}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {entry.entity_type.replace(/_/g, " ")}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), "dd MMM yyyy, h:mm a")}
                  {" · "}
                  By {formatAuditLogUserDetail(entry)}
                  {entry.description ? ` · ${entry.description}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function FulfillmentPanel({
  counts,
  pipeline,
}: {
  counts: AdminDashboardPayload["fulfillmentCounts"];
  pipeline: AdminDashboardPayload["pipeline"];
}) {
  const stages = [
    {
      label: "Needs store",
      count: counts.needsAssignment,
      href: "/admin/erp/fulfillment-queue?filter=needs_assignment",
      icon: Package,
    },
    {
      label: "Ready to ship",
      count: counts.readyToShip,
      href: "/admin/erp/fulfillment-queue?filter=ready_to_ship",
      icon: Boxes,
    },
    {
      label: "In transit",
      count: counts.shipped,
      href: "/admin/orders?status=shipped",
      icon: Truck,
    },
    {
      label: "Delivered",
      count: counts.delivered,
      href: "/admin/orders?status=delivered",
      icon: ShoppingCart,
    },
  ];

  const onlineOpen = pipeline.pending + pipeline.processing + pipeline.shipped;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Fulfillment &amp; online pipeline</CardTitle>
          <p className="text-xs text-muted-foreground">
            {onlineOpen.toLocaleString()} online orders in progress
          </p>
        </div>
        <Link
          href="/admin/erp/fulfillment-queue"
          className="text-xs text-primary hover:underline"
        >
          Fulfillment queue
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => (
            <Link
              key={stage.label}
              href={stage.href}
              className="flex items-center gap-3 rounded-lg border px-3 py-3 transition hover:border-primary/30 hover:bg-muted/50"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <stage.icon className="size-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{stage.label}</p>
                <p className="text-lg font-semibold tabular-nums">{stage.count}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1">
          {[
            { key: "pending", label: "Pending", count: pipeline.pending, color: "bg-amber-400" },
            {
              key: "processing",
              label: "Processing",
              count: pipeline.processing,
              color: "bg-sky-400",
            },
            { key: "shipped", label: "Shipped", count: pipeline.shipped, color: "bg-violet-400" },
            {
              key: "delivered",
              label: "Delivered",
              count: pipeline.delivered,
              color: "bg-emerald-400",
            },
          ].map((s) => {
            const total =
              pipeline.pending + pipeline.processing + pipeline.shipped + pipeline.delivered || 1;
            const pct = Math.max(8, (s.count / total) * 100);
            return (
              <Link
                key={s.key}
                href={`/admin/orders?status=${s.key}`}
                className="group text-center"
              >
                <div className="flex h-16 items-end overflow-hidden rounded-md bg-muted">
                  <div className={`w-full rounded-t-md ${s.color}`} style={{ height: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground group-hover:text-primary">
                  {s.label}
                </p>
                <p className="text-xs font-semibold tabular-nums">{s.count}</p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderTimelinePanel({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Online order timeline</CardTitle>
          <p className="text-xs text-muted-foreground">Latest storefront orders</p>
        </div>
        <Link href="/admin/orders" className="text-xs text-primary hover:underline">
          All orders
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {orders.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">No orders yet</li>
          ) : (
            orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {order.users?.name ?? order.users?.phone ?? "Guest"}
                      </p>
                      <StatusBadge status={order.status} />
                      {order.fulfillment_status ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {inventoryFulfillmentLabel(order.fulfillment_status)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.created_at
                        ? formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
                        : "—"}
                      {order.source ? ` · ${order.source}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {order.total_amount != null ? (
                      <CurrencyAmount amount={order.total_amount} compact />
                    ) : (
                      "—"
                    )}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function InventoryAlertsPanel({
  alerts,
  procurement,
  lowStockCount,
}: {
  alerts: DashboardAlert[];
  procurement: AdminDashboardPayload["procurement"];
  lowStockCount: number;
}) {
  const stockAlerts = alerts.filter((a) =>
    ["out-of-stock", "low-stock"].includes(a.id),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Inventory alerts</CardTitle>
          <p className="text-xs text-muted-foreground">Central catalog &amp; store stock</p>
        </div>
        <Link href="/admin/inventory" className="text-xs text-primary hover:underline">
          Inventory
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/erp/reports/item-stock"
            className="rounded-lg border px-3 py-3 hover:bg-muted"
          >
            <div className="flex items-center gap-2 text-rose-600">
              <TrendingDown className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">ERP low stock</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{lowStockCount}</p>
          </Link>
          <Link
            href="/admin/inventory"
            className="rounded-lg border px-3 py-3 hover:bg-muted"
          >
            <div className="flex items-center gap-2 text-amber-600">
              <Boxes className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">SKUs to restock</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {procurement.productsNeedingRestock}
            </p>
          </Link>
          <Link
            href="/admin/procurement"
            className="rounded-lg border px-3 py-3 hover:bg-muted"
          >
            <div className="flex items-center gap-2 text-sky-600">
              <FileText className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Pipeline shortage</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {procurement.pipelineShortageVariants}
            </p>
          </Link>
          <Link
            href="/admin/erp/reports/store-wise-stock"
            className="rounded-lg border px-3 py-3 hover:bg-muted"
          >
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingUp className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Units on hand</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {procurement.availableInventoryUnits.toLocaleString()}
            </p>
          </Link>
        </div>
        {stockAlerts.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {stockAlerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
              >
                <AlertTriangle className="size-3.5 text-amber-600" />
                {alert.count} {alert.label}
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardView() {
  const { settings } = useCurrencySettings();
  const { data, isError, error, isPending } = useQuery({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: () => adminGet<AdminDashboardPayload>("dashboard"),
    placeholderData: keepPreviousData,
  });

  if (isPending && !data) {
    return <AdminPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-medium text-rose-900">Failed to load dashboard.</p>
            <p className="mt-1 text-sm text-rose-700">
              {error instanceof Error ? error.message : "Unknown error."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <AdminPageSkeleton />;

  const {
    alerts,
    pipeline,
    business,
    procurement,
    recentOrders,
    erpFinancial,
    erpActivity,
    erpMonthlySeries,
    recentErpInvoices,
    erpInvoicesToday,
    fulfillmentCounts,
  } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <DashboardHeader />
      <AlertStrip alerts={alerts} />

      <section aria-label="Cash flow summary">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Cash flow summary</h2>
          <p className="text-xs text-muted-foreground">Current financial year</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-2">
            <ErpKpiStack erp={erpFinancial} settings={settings} />
          </div>
          <div className="lg:col-span-7">
            <IncomeCogsChart series={erpMonthlySeries} erp={erpFinancial} settings={settings} />
          </div>
          <div className="lg:col-span-3">
            <InvoiceStatusDonut
              data={erpFinancial?.invoice_status_ytd}
              settings={settings}
            />
          </div>
        </div>
      </section>

      <section aria-label="Sales and activity" className="grid gap-4 lg:grid-cols-3">
        <NetProfitChart series={erpMonthlySeries} settings={settings} />
        <DailySalesPanel
          invoices={recentErpInvoices}
          erpInvoicesToday={erpInvoicesToday}
          onlineOrdersToday={business.ordersToday}
          onlineRevenueToday={business.revenueToday}
        />
        <ActivityLogPanel entries={erpActivity} />
      </section>

      <section aria-label="Online operations" className="grid gap-4 lg:grid-cols-2">
        <FulfillmentPanel counts={fulfillmentCounts} pipeline={pipeline} />
        <OrderTimelinePanel orders={recentOrders} />
      </section>

      <section aria-label="Inventory">
        <InventoryAlertsPanel
          alerts={alerts}
          procurement={procurement}
          lowStockCount={erpFinancial?.low_stock_count ?? 0}
        />
      </section>

      <footer className="pt-2 text-center text-xs text-muted-foreground">
        BuyHub Management Console
      </footer>
    </div>
  );
}
