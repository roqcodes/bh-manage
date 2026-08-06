"use client";

import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  Plus,
  ShieldAlert,
  ShoppingBasket,
  Sparkles,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  AdminDashboardPayload,
  CatalogInventoryCoverage,
  DashboardAlert,
  DashboardAlertSeverity,
  Order,
  VendorSnapshotEntry,
} from "@/common/admin/types";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const BRAND = "#2563EB";
const BRAND_DEEP = "#9B0F2A";

/** Soft fills for progress rails (less saturated than brand defaults). */
const RAIL_GRADIENT = {
  success: "linear-gradient(90deg, #86efac, #4ade80)",
  warn: "linear-gradient(90deg, #fde68a, #fcd34d)",
  danger: "linear-gradient(90deg, #fecaca, #f87171)",
} as const;

/* ─────────────────────────── formatters ─────────────────────────── */

function formatInr(n: number, opts?: Intl.NumberFormatOptions) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0, ...opts })}`;
}

function compactInr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 1 : 2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function compactNum(n: number) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function parseLeadingPercent(value: string): number | null {
  const m = value.match(/^([\d.]+)\s*%/);
  return m ? Number(m[1]) : null;
}

/* ────────────────────────── atomic UI ─────────────────────────── */

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
    <div className="mb-3 flex items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className="flex size-6 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm shadow-slate-900/[0.03] ring-1 ring-white/80">
            <Icon className="size-3" aria-hidden />
          </span>
        ) : null}
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {children}
        </h2>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

function TrendChip({
  tone,
  children,
  title,
}: {
  tone: "up" | "down" | "neutral";
  children: ReactNode;
  title?: string;
}) {
  const tones = {
    up: "bg-emerald-50/80 text-emerald-600/90 ring-emerald-500/[0.08]",
    down: "bg-rose-50/80 text-rose-600/90 ring-rose-500/[0.08]",
    neutral: "bg-slate-100/90 text-slate-600/90 ring-slate-900/[0.05]",
  } as const;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ────────────────────────── hero header ────────────────────────── */

function DashboardHero() {
  return (
    <header className="pb-1">
      <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
        Dashboard
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
        Orders, inventory, vendors, and revenue — at a glance.
      </p>
    </header>
  );
}

/* ────────────────────────── alerts strip ────────────────────────── */

function alertColors(sev: DashboardAlertSeverity) {
  if (sev === "critical") {
    return {
      dot: "bg-rose-400/90",
      chip: "bg-rose-50/90 text-rose-600/95 ring-1 ring-rose-200/40",
      tint: "linear-gradient(135deg, #fecaca, #fb7185)",
    };
  }
  if (sev === "warning") {
    return {
      dot: "bg-amber-400/90",
      chip: "bg-amber-50/90 text-amber-700/90 ring-1 ring-amber-200/45",
      tint: "linear-gradient(135deg, #fef3c7, #fcd34d)",
    };
  }
  return {
    dot: "bg-slate-400/80",
    chip: "bg-slate-100/90 text-slate-600/95 ring-1 ring-slate-200/60",
    tint: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
  };
}

/** Icon / chevron tile: light surface + faint tint wash (not solid saturated fills). */
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

/** Outer shell + hover/shadow — matches `KpiCard` (Business pulse). */
const pulseCardShellClass =
  "group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_2px_10px_-4px_rgba(15,23,42,0.06),0_20px_40px_-24px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]";

function AlertStrip({ alerts }: { alerts: DashboardAlert[] }) {
  if (!alerts?.length) {
    const okTint = "linear-gradient(135deg, #bbf7d0, #6ee7b7)";
    return (
      <div className={pulseCardShellClass}>
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.11]"
          style={{ background: okTint }}
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <TintIconBadge tint={okTint}>
            <ShieldAlert aria-hidden />
          </TintIconBadge>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Status
            </p>
            <p className="mt-2 text-[15px] font-black leading-snug tracking-tight text-slate-950">
              All systems operational
            </p>
            <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-slate-500">
              No critical incidents in the pipeline right now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {alerts.map((a) => {
        const c = alertColors(a.severity);
        return (
          <Link
            key={a.id}
            href={a.href}
            className={`${pulseCardShellClass} flex items-start justify-between gap-3`}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.11]"
              style={{ background: c.tint }}
              aria-hidden
            />
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`size-1.5 shrink-0 rounded-full ${c.dot}`} />
                <span className="truncate text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {a.label}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-[28px] font-black tabular-nums leading-none tracking-tight text-slate-950">
                  {a.count.toLocaleString("en-IN")}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-widest ${c.chip}`}
                >
                  {a.severity}
                </span>
              </div>
            </div>
            <TintIconBadge tint={c.tint}>
              <ChevronRight
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </TintIconBadge>
          </Link>
        );
      })}
    </div>
  );
}

/* ────────────────────────── primary KPIs ────────────────────────── */

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tint,
  children,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tint: string;
  children?: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_2px_10px_-4px_rgba(15,23,42,0.06),0_20px_40px_-24px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.11]"
        style={{ background: tint }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-[28px] font-black leading-none tabular-nums tracking-tight text-slate-950">
            {value}
          </p>
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

/** Tiny inline progress rail used inside KPI cards. */
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
      <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold">
        <span className="uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>
        <span className="tabular-nums text-slate-700">{value}</span>
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

/* ────────────────────── order flow funnel ────────────────────── */

function OrderFlowFunnel({
  stages,
  summary,
}: {
  stages: { key: string; label: string; count: number; tone: string }[];
  summary: {
    inFlight: number;
    totalToday: number;
    deliveredRate: number;
  };
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.05), transparent 60%)",
        }}
      />
      <SectionEyebrow
        icon={Activity}
        trailing={
          <span className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {summary.totalToday.toLocaleString("en-IN")} orders · today
            </span>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[color:var(--brand)] transition-all hover:bg-[color:var(--brand)]/8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/30"
              style={{ ["--brand" as string]: BRAND }}
            >
              Orders
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          </span>
        }
      >
        Order pipeline
      </SectionEyebrow>

      <div className="relative grid flex-1 grid-cols-1 gap-3 lg:grid-cols-4">
        {stages.map((s, i) => {
          const pct = (s.count / max) * 100;
          const nextPct =
            i < stages.length - 1 ? (stages[i + 1].count / max) * 100 : pct;
          const stageHref = `/admin/orders?status=${encodeURIComponent(s.key)}`;
          return (
            <div key={s.key} className="relative flex flex-col">
              <Link
                href={stageHref}
                className="group/stage relative z-10 flex flex-1 flex-col rounded-xl border border-slate-200/60 bg-white px-4 py-5 shadow-sm ring-1 ring-slate-50 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-[0_14px_36px_-10px_rgba(15,23,42,0.14)] hover:ring-2 hover:ring-[#2563EB]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 active:translate-y-0"
              >
                <span
                  className={`absolute left-0 top-0 h-[3px] w-full rounded-t-xl ${s.tone}`}
                />
                <ArrowUpRight
                  className="absolute right-3 top-3 size-3.5 text-slate-300 opacity-0 transition-all duration-300 group-hover/stage:opacity-100 group-hover/stage:text-[color:var(--brand)]"
                  style={{ ["--brand" as string]: BRAND }}
                  aria-hidden
                />
                <div className="flex items-center justify-between pr-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Stage {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 text-[13px] font-bold text-slate-900 transition-colors group-hover/stage:text-slate-950">
                  {s.label}
                </p>
                <p className="mt-3 text-[34px] font-black tabular-nums leading-none tracking-tight text-slate-950">
                  {s.count.toLocaleString("en-IN")}
                </p>
                <div className="mt-auto pt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${s.tone}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              </Link>
              {i < stages.length - 1 ? (
                <div className="pointer-events-none absolute right-0 top-[52%] z-20 hidden translate-x-1/2 -translate-y-1/2 lg:block">
                  <div className="flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm">
                    <ArrowRight className="size-3" aria-hidden />
                  </div>
                </div>
              ) : null}
              {i < stages.length - 1 ? (
                <p className="mt-2 hidden text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 lg:block">
                  {nextPct > pct ? "+" : ""}
                  {(nextPct - pct).toFixed(0)}%
                </p>
              ) : (
                <div className="mt-2 hidden h-[14px] lg:block" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="relative mt-5 flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white/70 backdrop-blur md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
        <FunnelStat
          label="In-flight"
          value={summary.inFlight.toLocaleString("en-IN")}
          hint="Pending + processing + shipped"
          href="/admin/orders"
        />
        <FunnelStat
          label="Delivered"
          value={`${summary.deliveredRate.toFixed(0)}%`}
          hint="Share of today's volume"
          tone="emerald"
          href="/admin/orders?status=delivered"
        />
        <FunnelStat
          label="Total"
          value={summary.totalToday.toLocaleString("en-IN")}
          hint="Orders across all stages"
          href="/admin/orders"
        />
      </div>
    </div>
  );
}

function FunnelStat({
  label,
  value,
  hint,
  tone = "slate",
  href,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "slate" | "emerald";
  href?: string;
}) {
  const valueClr = tone === "emerald" ? "text-emerald-700" : "text-slate-950";
  const inner = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[18px] font-black tabular-nums leading-tight tracking-tight ${valueClr}`}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10.5px] font-semibold text-slate-400">
        {hint}
      </p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="group/stat block px-4 py-3 transition-all duration-300 hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB]/25"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">{inner}</div>
          <ArrowUpRight
            className="mt-0.5 size-3.5 shrink-0 text-slate-300 opacity-0 transition-all duration-300 group-hover/stat:translate-x-0.5 group-hover/stat:-translate-y-0.5 group-hover/stat:opacity-100 group-hover/stat:text-[color:var(--brand)]"
            style={{ ["--brand" as string]: BRAND }}
            aria-hidden
          />
        </div>
      </Link>
    );
  }
  return <div className="px-4 py-3">{inner}</div>;
}

/* ───────────────────── catalog inventory (products in stock / listed) ──────────────────── */

function CatalogInventoryPanel({ catalog }: { catalog: CatalogInventoryCoverage }) {
  const fillPct =
    catalog.totalProducts > 0
      ? (catalog.productsWithStock / catalog.totalProducts) * 100
      : 0;
  const visualPct = Math.min(100, fillPct);
  const radius = 58;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (visualPct / 100) * circ;

  const strong = fillPct >= 85;
  const weak = fillPct < 40;
  const stroke = strong ? "#10b981" : weak ? "#e11d48" : "#f59e0b";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      <SectionEyebrow icon={Gauge}>Catalog inventory</SectionEyebrow>

      <p className="mt-1 text-[12.5px] font-semibold leading-snug text-slate-500">
        Products with sellable central inventory vs. total products in catalog.
      </p>

      <div className="relative mt-4 flex flex-1 flex-col items-center justify-center py-2">
        <svg viewBox="0 0 160 160" className="size-44">
          <defs>
            <linearGradient id="catalogGaugeFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.9" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="url(#catalogGaugeFill)"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 80 80)"
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Fill rate
          </span>
          <span className="text-[32px] font-black tabular-nums leading-none tracking-tight text-slate-950">
            {Math.round(fillPct)}%
          </span>
          <span
            className="mt-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest"
            style={{
              background: `${stroke}18`,
              color: stroke,
            }}
          >
            {strong ? "Strong" : weak ? "Low" : "Building"}
          </span>
        </div>
      </div>


      <Link
        href="/admin/inventory"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        Manage inventory
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

/* ──────────────────── revenue / margin chart ──────────────────── */

function RevenueBreakdown({
  revenue,
  margin,
  orders,
  aov,
}: {
  revenue: number;
  margin: number;
  orders: number;
  aov: number;
}) {
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
  const costs = Math.max(0, revenue - margin);
  const costPct = 100 - marginPct;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.03), transparent 60%)",
        }}
      />
      <SectionEyebrow
        icon={Zap}
        trailing={
          <span className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-900/[0.05]">
              Today
            </span>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[color:var(--brand)] transition-all hover:bg-[color:var(--brand)]/8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/30"
              style={{ ["--brand" as string]: BRAND }}
            >
              Order ledger
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          </span>
        }
      >
        Revenue
      </SectionEyebrow>

      <div className="relative grid flex-1 gap-6 md:grid-cols-5">
        <Link
          href="/admin/orders"
          className="group/revhead flex flex-col rounded-2xl border border-slate-100 bg-slate-50/30 p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-200/80 hover:bg-white hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 md:col-span-2"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Gross revenue
            </p>
            <ArrowUpRight
              className="size-3.5 shrink-0 text-slate-300 opacity-0 transition-all duration-300 group-hover/revhead:opacity-100 group-hover/revhead:text-[color:var(--brand)]"
              style={{ ["--brand" as string]: BRAND }}
              aria-hidden
            />
          </div>
          <p className="mt-1 text-[34px] font-black leading-none tabular-nums tracking-tight text-slate-950">
            {formatInr(revenue)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <TrendChip tone="neutral">
              <Users className="size-3" aria-hidden />
              {orders.toLocaleString("en-IN")} orders
            </TrendChip>
            <TrendChip tone="neutral">
              AOV {orders > 0 ? formatInr(aov) : "—"}
            </TrendChip>
          </div>

          <div className="mt-auto space-y-2 pt-8">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="uppercase tracking-[0.14em] text-slate-400">
                Composition
              </span>
              <span className="tabular-nums text-slate-500">100%</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <div
                className="h-full"
                style={{
                  width: `${marginPct}%`,
                  background: RAIL_GRADIENT.success,
                }}
                title="Margin"
              />
              <div
                className="h-full"
                style={{
                  width: `${costPct}%`,
                  background:
                    "linear-gradient(90deg, #f8fafc 0%, #e8eef4 100%)",
                }}
                title="Cost"
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600/90">
                <span className="size-1.5 rounded-full bg-emerald-400/90" />
                Margin {marginPct.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                Cost {costPct.toFixed(1)}%
                <span className="size-1.5 rounded-full bg-slate-300/90" />
              </span>
            </div>
          </div>
        </Link>

        <div className="grid h-full grid-cols-1 gap-4 md:col-span-3 md:grid-cols-2">
          <RevenueTile
            label="Margin today"
            value={formatInr(margin)}
            sub={`${marginPct.toFixed(1)}% of revenue`}
            tone="emerald"
            href="/admin/orders"
          />
          <RevenueTile
            label="Estimated cost"
            value={formatInr(costs)}
            sub={`${costPct.toFixed(1)}% of revenue`}
            tone="slate"
            href="/admin/orders"
          />
          <RevenueTile
            label="Avg order value"
            value={orders > 0 ? formatInr(aov) : "—"}
            sub={`${orders.toLocaleString("en-IN")} orders placed`}
            tone="indigo"
            href="/admin/orders"
          />
          <RevenueTile
            label="Contribution per order"
            value={orders > 0 ? formatInr(margin / orders) : "—"}
            sub="Margin / orders today"
            tone="rose"
            href="/admin/orders"
          />
        </div>
      </div>
    </div>
  );
}

function RevenueTile({
  label,
  value,
  sub,
  tone,
  href = "/admin/orders",
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "slate" | "indigo" | "rose";
  href?: string;
}) {
  const palette = {
    emerald: "from-emerald-200 to-teal-300",
    slate: "from-slate-200 to-slate-400",
    indigo: "from-indigo-200 to-blue-300",
    rose: "from-rose-200 to-rose-300",
  } as const;
  return (
    <Link
      href={href}
      className="group/rtile relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_14px_36px_-12px_rgba(15,23,42,0.12)] hover:ring-2 hover:ring-[#2563EB]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 active:translate-y-0"
    >
      <div
        className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${palette[tone]} opacity-[0.08] blur-2xl transition-opacity duration-300 group-hover/rtile:opacity-[0.12]`}
        aria-hidden
      />
      <ArrowUpRight
        className="absolute right-3 top-3 size-3.5 text-slate-300 opacity-0 transition-all duration-300 group-hover/rtile:translate-x-0.5 group-hover/rtile:-translate-y-0.5 group-hover/rtile:opacity-100 group-hover/rtile:text-[color:var(--brand)]"
        style={{ ["--brand" as string]: BRAND }}
        aria-hidden
      />
      <p className="pr-7 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-black tabular-nums leading-tight tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-auto pt-1 text-[11px] font-semibold text-slate-500">
        {sub}
      </p>
    </Link>
  );
}

/* ────────────────────── quick actions deck ────────────────────── */

const QUICK_ACTIONS: {
  label: string;
  sub: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    label: "Orders",
    sub: "Approve & ship",
    href: "/admin/orders",
    icon: ShoppingBasket,
    accent: "from-rose-100 to-rose-200",
  },
  {
    label: "Procurement",
    sub: "Run the engine",
    href: "/admin/procurement",
    icon: Zap,
    accent: "from-amber-100 to-amber-200",
  },
  {
    label: "Purchase orders",
    sub: "Track vendor POs",
    href: "/admin/purchase-orders",
    icon: FileText,
    accent: "from-indigo-100 to-indigo-200",
  },
  {
    label: "Inventory",
    sub: "Central stock ops",
    href: "/admin/inventory",
    icon: Boxes,
    accent: "from-sky-100 to-cyan-100",
  },
  {
    label: "Vendors",
    sub: "Onboarding & risk",
    href: "/admin/vendors",
    icon: Building2,
    accent: "from-violet-100 to-violet-200",
  },
  {
    label: "Delivery",
    sub: "Last-mile grid",
    href: "/admin/delivery",
    icon: Truck,
    accent: "from-emerald-100 to-teal-100",
  },
];

function QuickActionsDeck() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      <SectionEyebrow
        icon={Plus}
        trailing={
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
            ⌘K
          </span>
        }
      >
        Control deck
      </SectionEyebrow>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-slate-200/70 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200/55 bg-white/90 shadow-sm shadow-slate-900/[0.04]">
                <span
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.accent} opacity-[0.45]`}
                  aria-hidden
                />
                <Icon className="relative size-4 text-slate-500" aria-hidden />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-slate-900 transition group-hover:text-slate-950">
                  {a.label}
                </p>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {a.sub}
                </p>
              </div>
              <ArrowUpRight className="absolute right-3 top-3 size-3.5 text-slate-300 transition group-hover:text-slate-700" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────── vendor leaderboard ────────────────────── */

type VendorTabKey = "fulfillment" | "price" | "reliability";

function VendorLeaderboard({
  topByFulfillment,
  lowestAvgPrice,
  topByPoReliability,
}: {
  topByFulfillment: VendorSnapshotEntry[];
  lowestAvgPrice: VendorSnapshotEntry[];
  topByPoReliability: VendorSnapshotEntry[];
}) {
  const [tab, setTab] = useState<VendorTabKey>("fulfillment");
  const tabs: {
    key: VendorTabKey;
    label: string;
    hint: string;
    rows: VendorSnapshotEntry[];
    empty: string;
    accent: string;
    /** Slightly stronger pastel for thin progress fills (still softer than 500-stops). */
    barAccent: string;
  }[] = [
    {
      key: "fulfillment",
      label: "Fulfillment · 45d",
      hint: "Highest ship-through rate",
      rows: topByFulfillment,
      empty: "No vendor lines yet.",
      accent: "from-amber-100 to-amber-200",
      barAccent: "from-amber-300 to-orange-300",
    },
    {
      key: "price",
      label: "Lowest avg price",
      hint: "Best unit economics",
      rows: lowestAvgPrice,
      empty: "No vendor offers yet.",
      accent: "from-emerald-100 to-teal-100",
      barAccent: "from-emerald-300 to-teal-400",
    },
    {
      key: "reliability",
      label: "PO reliability",
      hint: "On-time acceptance score",
      rows: topByPoReliability,
      empty: "Not enough PO history.",
      accent: "from-violet-100 to-violet-200",
      barAccent: "from-violet-300 to-purple-400",
    },
  ];

  const active = tabs.find((t) => t.key === tab) ?? tabs[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <SectionEyebrow icon={Building2}>Vendor Performance</SectionEyebrow>
          <p className="-mt-1 text-[12.5px] font-semibold text-slate-500">
            {active.hint}
          </p>
        </div>
        <div className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/70 bg-slate-50/70 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {active.rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Building2 className="size-10 text-slate-200" />
          <p className="text-sm font-semibold text-slate-400">{active.empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {active.rows.map((r, idx) => {
            const pct = parseLeadingPercent(r.value);
            return (
              <li key={r.vendorId}>
                <Link
                  href={`/admin/vendors/${r.vendorId}`}
                  className="group flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                >
                  <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/55 bg-white/90 text-[13px] font-black text-slate-600 shadow-sm shadow-slate-900/[0.04]">
                    <span
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${active.accent} opacity-[0.4]`}
                      aria-hidden
                    />
                    <span className="relative">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-bold text-slate-900 transition group-hover:text-[color:var(--brand)]"
                        style={{ ["--brand" as string]: BRAND }}
                      >
                        {r.name ?? "Unnamed vendor"}
                      </p>
                    </div>
                    <p className="text-[11.5px] font-semibold text-slate-500">
                      {r.headline}
                    </p>
                    {pct != null ? (
                      <div className="mt-2 flex min-w-0 items-center gap-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:w-40 sm:flex-none">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${active.barAccent}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold tabular-nums text-slate-500">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    <span className="text-[13px] font-bold tabular-nums text-slate-700 sm:text-right">
                      {r.value}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────── recent orders feed ─────────────────────── */

function RecentOrdersFeed({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-12 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
        <ShoppingBasket className="mx-auto size-12 text-slate-200" />
        <p className="mt-3 text-sm font-semibold text-slate-400">
          No recent orders.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <SectionEyebrow icon={Clock}>Live order stream</SectionEyebrow>
          <p className="-mt-1 text-[12.5px] font-semibold text-slate-500">
            Most recent {orders.length} orders across the fleet
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex shrink-0 items-center gap-1 self-start text-[12px] font-bold text-[color:var(--brand)] transition hover:gap-1.5 sm:self-auto"
          style={{ ["--brand" as string]: BRAND }}
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <ul className="divide-y divide-slate-100">
        {orders.map((order) => {
          const when = order.created_at ? new Date(order.created_at) : null;
          return (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="group flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/60 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex size-2">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ background: BRAND }}
                    />
                    <span
                      className="relative inline-flex size-2 rounded-full"
                      style={{ background: BRAND }}
                    />
                  </span>
                  <span className="font-mono text-[11.5px] font-bold text-slate-500">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-bold text-slate-900">
                      {order.users?.name ?? "Anonymous customer"}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  {when ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      <Clock className="size-3" aria-hidden />
                      {formatDistanceToNow(when, { addSuffix: true })}
                      <span className="text-slate-300">·</span>
                      {format(when, "MMM d, HH:mm")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-[15px] font-black tabular-nums leading-none text-slate-950">
                      {compactInr(Number(order.total_amount ?? 0))}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Order total
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────────── main view ─────────────────────────── */

export function AdminDashboardView() {
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
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5">
          <AlertTriangle className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-bold text-rose-900">
              Failed to load dashboard.
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-rose-700">
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
    catalogCoverage,
    vendors,
    recentOrders,
  } = data;

  const catalogFillPct =
    catalogCoverage.totalProducts > 0
      ? (catalogCoverage.productsWithStock / catalogCoverage.totalProducts) * 100
      : 0;
  const marginPct =
    business.revenueToday > 0
      ? (business.marginToday / business.revenueToday) * 100
      : 0;

  const stages = [
    {
      key: "pending",
      label: "Pending",
      count: pipeline.pending,
      tone: "bg-amber-300",
    },
    {
      key: "processing",
      label: "Processing",
      count: pipeline.processing,
      tone: "bg-sky-300",
    },
    {
      key: "shipped",
      label: "Shipped",
      count: pipeline.shipped,
      tone: "bg-violet-300",
    },
    {
      key: "delivered",
      label: "Delivered",
      count: pipeline.delivered,
      tone: "bg-emerald-300",
    },
  ];

  const totalInFlight = pipeline.pending + pipeline.processing + pipeline.shipped;
  const totalToday =
    pipeline.pending +
    pipeline.processing +
    pipeline.shipped +
    pipeline.delivered;
  const deliveredRate =
    totalToday > 0 ? (pipeline.delivered / totalToday) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-3 sm:px-4 sm:py-4">
      <div className="space-y-4 lg:space-y-5">
        <DashboardHero />

        <section aria-label="Alerts">
          <SectionEyebrow icon={ShieldAlert}>Risk surface</SectionEyebrow>
          <AlertStrip alerts={alerts} />
        </section>

        {/* Primary KPI grid */}
        <section aria-label="Business KPIs">
          <SectionEyebrow
            icon={Sparkles}
            trailing={
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Today · live
              </span>
            }
          >
            Business pulse
          </SectionEyebrow>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <KpiCard
              label="Revenue"
              value={compactInr(business.revenueToday)}
              icon={Sparkles}
              tint="linear-gradient(135deg, #fce8ec, #e9b8c4)"
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  <TrendChip tone="up">
                    Margin {marginPct.toFixed(1)}%
                  </TrendChip>
                  <TrendChip tone="neutral">
                    {business.ordersToday.toLocaleString("en-IN")} orders
                  </TrendChip>
                </div>
              }
            >
              <InlineRail
                pct={marginPct}
                label="Margin vs revenue"
                value={compactInr(business.marginToday)}
                gradient={RAIL_GRADIENT.success}
              />
            </KpiCard>

            <KpiCard
              label="Orders"
              value={business.ordersToday.toLocaleString("en-IN")}
              icon={ShoppingBasket}
              tint="linear-gradient(135deg, #e0e7ff, #c7d2fe)"
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  <TrendChip tone="neutral">
                    AOV{" "}
                    {business.ordersToday > 0
                      ? compactInr(business.averageOrderValue)
                      : "—"}
                  </TrendChip>
                  <TrendChip tone="neutral">
                    {pipeline.pending.toLocaleString("en-IN")} pending
                  </TrendChip>
                </div>
              }
            >
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: "P", count: pipeline.pending, bg: "bg-amber-300" },
                  {
                    label: "X",
                    count: pipeline.processing,
                    bg: "bg-sky-300",
                  },
                  {
                    label: "S",
                    count: pipeline.shipped,
                    bg: "bg-violet-300",
                  },
                  {
                    label: "D",
                    count: pipeline.delivered,
                    bg: "bg-emerald-300",
                  },
                ].map((s) => {
                  const total =
                    pipeline.pending +
                      pipeline.processing +
                      pipeline.shipped +
                      pipeline.delivered || 1;
                  const pct = Math.max(6, (s.count / total) * 100);
                  return (
                    <div key={s.label} className="flex flex-col items-center gap-1">
                      <div className="flex h-8 w-full items-end overflow-hidden rounded-md bg-slate-100">
                        <div
                          className={`w-full rounded-md ${s.bg}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold tabular-nums text-slate-500">
                        {s.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </KpiCard>

            <KpiCard
              label="Catalog inventory"
              value={`${catalogCoverage.productsWithStock.toLocaleString("en-IN")} / ${catalogCoverage.totalProducts.toLocaleString("en-IN")}`}
              icon={Gauge}
              tint={
                catalogFillPct >= 85
                  ? "linear-gradient(135deg, #d1fae5, #a7f3d0)"
                  : catalogFillPct < 40
                    ? "linear-gradient(135deg, #ffe4e6, #fecdd3)"
                    : "linear-gradient(135deg, #fef9c3, #fde68a)"
              }
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  <TrendChip
                    tone={
                      catalogFillPct >= 85
                        ? "up"
                        : catalogFillPct < 40
                          ? "down"
                          : "neutral"
                    }
                  >
                    {Math.round(catalogFillPct)}% listed with stock
                  </TrendChip>
                </div>
              }
            >
              <InlineRail
                pct={Math.min(100, catalogFillPct)}
                label="Catalog fill"
                value={`${catalogCoverage.productsWithStock} / ${catalogCoverage.totalProducts}`}
                gradient={
                  catalogFillPct >= 85
                    ? RAIL_GRADIENT.success
                    : catalogFillPct < 40
                      ? RAIL_GRADIENT.danger
                      : RAIL_GRADIENT.warn
                }
              />
            </KpiCard>

            <KpiCard
              label="SKUs to restock"
              value={procurement.productsNeedingRestock.toLocaleString(
                "en-IN",
              )}
              icon={Boxes}
              tint="linear-gradient(135deg, #ffe4e6, #fbcfe8)"
              delta={
                <TrendChip tone="neutral">
                  Low or out of stock (central)
                </TrendChip>
              }
            >
              <Link
                href="/admin/procurement"
                className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-white"
              >
                Open procurement engine
                <ArrowRight className="size-3.5" />
              </Link>
            </KpiCard>
          </div>
        </section>

        {/* Pipeline + catalog inventory */}
        <section aria-label="Operations">
          <div className="grid items-stretch gap-4 lg:grid-cols-3">
            <div className="h-full lg:col-span-2">
              <OrderFlowFunnel
                stages={stages}
                summary={{
                  inFlight: totalInFlight,
                  totalToday,
                  deliveredRate,
                }}
              />
            </div>
            <div className="h-full">
              <CatalogInventoryPanel catalog={catalogCoverage} />
            </div>
          </div>
        </section>

        {/* Revenue breakdown + quick actions */}
        <section aria-label="Revenue and actions">
          <div className="grid items-stretch gap-4">
            <div className="h-full w-full lg:col-span-2">
              <RevenueBreakdown
                revenue={business.revenueToday}
                margin={business.marginToday}
                orders={business.ordersToday}
                aov={business.averageOrderValue}
              />
            </div>

          </div>
        </section>

        {/* Vendor leaderboard */}
        <section aria-label="Vendors">
          <VendorLeaderboard
            topByFulfillment={vendors.topByFulfillment}
            lowestAvgPrice={vendors.lowestAvgPrice}
            topByPoReliability={vendors.topByPoReliability}
          />
        </section>

        {/* Recent orders */}
        <section aria-label="Recent orders">
          <RecentOrdersFeed orders={recentOrders} />
        </section>

        <footer className="pt-2 text-center text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-300">
          BuyHub · Management Console · v2.0
        </footer>
      </div>
    </div>
  );
}
