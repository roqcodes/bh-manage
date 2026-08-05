"use client";

import { useMemo, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Package,
  Search,
  Sparkles,
  Truck,
  CheckCircle2,
  ShoppingBag,
  Ban,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import type {
  Order,
  OrderCatalogStats,
  OrderStatusFilter,
} from "@/common/admin/types";
import { ORDER_STATUS_FILTERS } from "@/common/admin/types";
import type { OrderFilterUserRow } from "@/modules/orders/services/orders.service";
import { updateOrderStatusAction } from "@/modules/orders/actions/orders.actions";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { Pagination } from "@/modules/admin/components/pagination";

const BRAND = "#2563EB";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

const ROW_TINTS = [
  "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
  "linear-gradient(135deg, #fce8ec, #e9b8c4)",
  "linear-gradient(135deg, #d1fae5, #a7f3d0)",
  "linear-gradient(135deg, #fef9c3, #fde68a)",
  "linear-gradient(135deg, #cffafe, #a5f3fc)",
];

function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ROW_TINTS[h % ROW_TINTS.length];
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function shortOrderRef(id: string) {
  return id.split("-")[0]?.toUpperCase() ?? id.slice(0, 8);
}

function SectionEyebrow({
  icon: Icon,
  children,
  trailing,
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm shadow-slate-900/[0.03] ring-1 ring-white/80">
            <Icon className="size-3" aria-hidden />
          </span>
        ) : null}
        <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {children}
        </h2>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

function TintIconBadge({
  tint,
  children,
}: {
  tint: string;
  children: ReactNode;
}) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/55 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ background: tint }}
        aria-hidden
      />
      <span className="relative text-slate-500 [&_svg]:size-4">{children}</span>
    </span>
  );
}

function TrendChip({
  tone,
  children,
}: {
  tone: "up" | "down" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    up: "bg-emerald-50/80 text-emerald-700/90 ring-emerald-500/[0.08]",
    down: "bg-rose-50/80 text-rose-700/90 ring-rose-500/[0.08]",
    neutral: "bg-slate-100/90 text-slate-600/90 ring-slate-900/[0.05]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function InlineRail({
  pct,
  label,
  value,
  gradient,
}: {
  pct: number;
  label: string;
  value: string;
  gradient: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold">
        <span className="uppercase tracking-[0.12em] text-slate-400">{label}</span>
        <span className="tabular-nums text-slate-600">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, background: gradient }}
        />
      </div>
    </div>
  );
}

const RAIL_BRAND = "linear-gradient(90deg, #fecdd3, #fb7185)";

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tint,
  children,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tint: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`group ${CARD} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.11]"
        style={{ background: tint }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <div className="mt-2 text-2xl font-bold tabular-nums leading-none tracking-tight text-slate-900">
            {value}
          </div>
        </div>
        <TintIconBadge tint={tint}>
          <Icon aria-hidden />
        </TintIconBadge>
      </div>
      {delta ? <div className="relative mt-3">{delta}</div> : null}
      {children ? <div className="relative mt-4">{children}</div> : null}
    </div>
  );
}

function statusCount(
  stats: OrderCatalogStats,
  s: OrderStatusFilter,
): number {
  if (s === "all") return stats.totalOrders;
  const key = `${s}Count` as keyof OrderCatalogStats;
  const v = stats[key];
  return typeof v === "number" ? v : 0;
}

function StatusSelect({
  orderId,
  current,
}: {
  orderId: string;
  current: string;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      disabled={isPending}
      value={current}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await updateOrderStatusAction(orderId, next);
          void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
        });
      }}
      className="h-9 w-full rounded-xl border border-slate-200/80 bg-white px-2.5 text-[12px] font-semibold text-slate-700 outline-none transition focus:border-[color:var(--brand)]/40 focus:ring-2 focus:ring-[color:var(--brand)]/15 disabled:opacity-50"
      style={{ ["--brand" as string]: BRAND }}
      onClick={(e) => e.stopPropagation()}
    >
      {(["pending", "processing", "shipped", "delivered", "cancelled"] as const).map(
        (s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ),
      )}
    </select>
  );
}

function OrderRowCard({
  order,
}: {
  order: Order;
}) {
  const tint = tintFor(order.id);
  const total = Number(order.total_amount ?? 0);

  return (
    <div
      className={`group ${CARD} flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]`}
    >
      <div className="relative h-36 w-full shrink-0 overflow-hidden bg-slate-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{ background: tint }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <ShoppingBag className="size-12 text-slate-300" strokeWidth={1.25} aria-hidden />
        </div>
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Order
        </p>
        <Link
          href={`/admin/orders/${order.id}`}
          className="mt-0.5 text-[17px] font-bold tracking-tight text-[color:var(--brand)] transition hover:underline"
          style={{ ["--brand" as string]: BRAND }}
        >
          #{shortOrderRef(order.id)}
        </Link>
        <p className="mt-2 line-clamp-2 text-[13px] font-medium text-slate-600">
          {order.users?.name ?? "Guest"}
          {order.users?.email ? (
            <span className="mt-0.5 block truncate text-[12px] font-medium text-slate-400">
              {order.users.email}
            </span>
          ) : null}
        </p>

        <p className="mt-3 text-[11px] font-medium text-slate-400">
          {order.created_at
            ? format(new Date(order.created_at), "MMM d, yyyy · h:mm a")
            : "—"}
        </p>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Total
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">
            {formatInr(total)}
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Update status
          </p>
          <StatusSelect orderId={order.id} current={order.status} />
        </div>

        <Link
          href={`/admin/orders/${order.id}`}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          View details
        </Link>
      </div>
    </div>
  );
}

export function OrdersPanel({
  orders,
  total,
  page,
  statusFilter,
  filterUsers,
  selectedUserId,
  stats,
}: {
  orders: Order[];
  total: number;
  page: number;
  statusFilter: OrderStatusFilter;
  filterUsers: OrderFilterUserRow[];
  selectedUserId: string | null;
  stats: OrderCatalogStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  const listParams: Record<string, string> = {};
  if (statusFilter !== "all") listParams.status = statusFilter;
  if (selectedUserId) listParams.userId = selectedUserId;

  function handleStatusFilter(status: OrderStatusFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", status);
    params.delete("page");
    router.push(`/admin/orders?${params.toString()}`);
  }

  function handleUserFilter(userId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (userId) params.set("userId", userId);
    else params.delete("userId");
    params.delete("page");
    router.push(`/admin/orders?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const idMatch = o.id.toLowerCase().includes(q);
      const refMatch = shortOrderRef(o.id).toLowerCase().includes(q);
      const name = (o.users?.name ?? "").toLowerCase();
      const email = (o.users?.email ?? "").toLowerCase();
      return idMatch || refMatch || name.includes(q) || email.includes(q);
    });
  }, [orders, search]);

  const isFiltering = search.trim().length > 0;
  const openQueue = stats.pendingCount + stats.processingCount;
  const settled = stats.deliveredCount + stats.cancelledCount;
  const openPct =
    stats.totalOrders > 0 ? (openQueue / stats.totalOrders) * 100 : 0;

  return (
    <div className="space-y-6 lg:space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Order pipeline
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
          Customer orders across fulfillment stages. Filter by status or
          customer; counts below reflect the full catalog, not just this page.
        </p>
      </header>

      <section aria-label="Orders summary">
        <SectionEyebrow
          icon={Sparkles}
          trailing={
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Fleet · live
            </span>
          }
        >
          At a glance
        </SectionEyebrow>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="All orders"
            value={stats.totalOrders.toLocaleString("en-IN")}
            icon={ClipboardList}
            tint="linear-gradient(135deg, #e0e7ff, #c7d2fe)"
            delta={
              <TrendChip tone={stats.cancelledCount > 0 ? "down" : "neutral"}>
                {stats.cancelledCount.toLocaleString("en-IN")} cancelled
              </TrendChip>
            }
          />
          <KpiCard
            label="Open queue"
            value={(openQueue).toLocaleString("en-IN")}
            icon={Clock}
            tint="linear-gradient(135deg, #fef9c3, #fde68a)"
            delta={
              <TrendChip tone={openQueue > 0 ? "neutral" : "up"}>
                Pending + processing
              </TrendChip>
            }
          >
            <InlineRail
              pct={openPct}
              label="Share of volume"
              value={`${stats.pendingCount} · ${stats.processingCount}`}
              gradient={RAIL_BRAND}
            />
          </KpiCard>
          <KpiCard
            label="Shipped"
            value={stats.shippedCount.toLocaleString("en-IN")}
            icon={Truck}
            tint="linear-gradient(135deg, #ede9fe, #ddd6fe)"
            delta={
              <TrendChip tone="neutral">Out for delivery</TrendChip>
            }
          />
          <KpiCard
            label="Settled"
            value={settled.toLocaleString("en-IN")}
            icon={CheckCircle2}
            tint="linear-gradient(135deg, #d1fae5, #a7f3d0)"
            delta={
              <TrendChip tone="up">
                {stats.deliveredCount.toLocaleString("en-IN")} delivered
              </TrendChip>
            }
          />
        </div>
      </section>

      <section aria-label="Filters">
        <SectionEyebrow
          icon={Package}
          trailing={
            <label className="relative hidden items-center sm:flex">
              <span className="sr-only">Customer</span>
              <select
                value={selectedUserId ?? ""}
                onChange={(e) => handleUserFilter(e.target.value)}
                className="h-9 max-w-[220px] cursor-pointer truncate rounded-xl border border-slate-200/70 bg-white pl-3 pr-8 text-[12px] font-semibold text-slate-700 shadow-sm outline-none transition focus:border-[color:var(--brand)]/40 focus:ring-2 focus:ring-[color:var(--brand)]/15"
                style={{ ["--brand" as string]: BRAND }}
              >
                <option value="">All customers</option>
                {filterUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name
                      ? `${u.name}${u.email ? ` · ${u.email}` : ""}`
                      : (u.email ?? u.id)}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          Status & customer
        </SectionEyebrow>

        <div className="mb-4 sm:hidden">
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Customer
          </label>
          <select
            value={selectedUserId ?? ""}
            onChange={(e) => handleUserFilter(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none focus:border-[color:var(--brand)]/40 focus:ring-2 focus:ring-[color:var(--brand)]/15"
            style={{ ["--brand" as string]: BRAND }}
          >
            <option value="">All customers</option>
            {filterUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name
                  ? `${u.name}${u.email ? ` · ${u.email}` : ""}`
                  : (u.email ?? u.id)}
              </option>
            ))}
          </select>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {ORDER_STATUS_FILTERS.map((s) => {
            const active = statusFilter === s;
            const count = statusCount(stats, s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusFilter(s)}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition",
                  active
                    ? "border-[color:var(--brand)]/35 bg-[color:var(--brand)]/10 text-slate-900 shadow-sm ring-1 ring-[color:var(--brand)]/20"
                    : "border-slate-200/70 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80",
                ].join(" ")}
                style={{ ["--brand" as string]: BRAND }}
              >
                <span
                  className={`text-[12px] font-semibold capitalize ${active ? "text-slate-900" : ""}`}
                >
                  {s}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                    active
                      ? "bg-white/80 text-slate-700 ring-1 ring-slate-200/60"
                      : "bg-slate-100/90 text-slate-500"
                  }`}
                >
                  {count.toLocaleString("en-IN")}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Order list">
        <SectionEyebrow
          icon={ShoppingBag}
          trailing={
            <label className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-3 size-3.5 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders…"
                className="h-9 w-44 rounded-xl border border-slate-200/70 bg-white pl-8 pr-3 text-[12.5px] font-medium text-slate-700 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[color:var(--brand)]/40 focus:ring-2 focus:ring-[color:var(--brand)]/20 sm:w-56"
                style={{ ["--brand" as string]: BRAND }}
              />
            </label>
          }
        >
          {isFiltering
            ? `${filtered.length} of ${orders.length} on this page`
            : `Page ${page + 1} · ${total.toLocaleString("en-IN")} matching`}
        </SectionEyebrow>

        {filtered.length === 0 ? (
          <div
            className={`flex flex-col items-center gap-3 px-6 py-16 text-center ${CARD}`}
          >
            <Ban className="size-12 text-slate-200" aria-hidden />
            <p className="text-sm font-medium text-slate-500">
              {isFiltering
                ? "No orders match your search on this page."
                : "No orders in this view."}
            </p>
            {isFiltering ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((order) => (
              <OrderRowCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {!isFiltering && total > orders.length ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
            <Pagination
              total={total}
              page={page}
              basePath="/admin/orders"
              extraParams={listParams}
            />
          </div>
        ) : null}
      </section>

      <footer className="pt-1 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
        BuyHub · Orders
      </footer>
    </div>
  );
}
