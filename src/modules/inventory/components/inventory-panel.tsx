"use client";

import { useMemo, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  Pencil,
  Warehouse,
  Search,
  Sparkles,
  Package,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import type { InventoryCatalogStats, InventoryWithVariant } from "@/common/admin/types";
import { overrideStockAction } from "@/modules/inventory/actions/inventory.actions";
import { Pagination } from "@/modules/admin/components/pagination";
import {
  Modal,
  FieldLabel,
  FormError,
  PrimaryBtn,
  SecondaryBtn,
  inputCls,
} from "@/modules/admin/components/modal";

const BRAND = "#2563EB";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

const ROW_TINTS = [
  "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
  "linear-gradient(135deg, #d1fae5, #a7f3d0)",
  "linear-gradient(135deg, #fce8ec, #e9b8c4)",
  "linear-gradient(135deg, #fef9c3, #fde68a)",
  "linear-gradient(135deg, #cffafe, #a5f3fc)",
];

function tintFor(variantId: string): string {
  let h = 0;
  for (let i = 0; i < variantId.length; i++) h = (h * 31 + variantId.charCodeAt(i)) >>> 0;
  return ROW_TINTS[h % ROW_TINTS.length];
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
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className="flex size-6 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm shadow-slate-900/[0.03] ring-1 ring-white/80">
            <Icon className="size-3" aria-hidden />
          </span>
        ) : null}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
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
      <div className="relative flex items-start justify-between">
        <div>
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

const RAIL_OK = "linear-gradient(90deg, #86efac, #4ade80)";
const RAIL_WARN = "linear-gradient(90deg, #fde68a, #fcd34d)";
const RAIL_DANGER = "linear-gradient(90deg, #fecaca, #f87171)";

function StockOverrideModal({
  row,
  onClose,
}: {
  row: InventoryWithVariant;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const stock = parseInt(fd.get("stock") as string, 10);
    if (Number.isNaN(stock) || stock < 0) {
      return setError("Enter a valid non-negative number.");
    }
    setError(null);
    startTransition(async () => {
      try {
        await overrideStockAction(row.variant_id, stock);
        void queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <p className="font-semibold text-slate-900">
          {row.product_variants?.products?.name ?? "—"}
        </p>
        <p className="mt-0.5 font-medium text-slate-500">
          {row.product_variants?.name ?? "—"}
        </p>
      </div>
      <FieldLabel label="New Stock (units)">
        <input
          className={inputCls}
          name="stock"
          type="number"
          min="0"
          defaultValue={row.stock ?? 0}
          required
        />
      </FieldLabel>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Override Stock"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function InventoryRowCard({
  row,
  onEdit,
}: {
  row: InventoryWithVariant;
  onEdit: () => void;
}) {
  const tint = tintFor(row.variant_id);
  const stock = Math.max(0, Math.floor(Number(row.stock ?? 0)));
  const low = stock > 0 && stock < 10;
  const critical = stock < 1;
  const productId = row.product_variants?.products?.id;

  return (
    <div
      className={`group ${CARD} flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]`}
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          style={{ background: tint }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Warehouse className="size-14 text-slate-300" strokeWidth={1.25} aria-hidden />
        </div>
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {critical ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-800 ring-1 ring-rose-200/50 backdrop-blur">
              Out of stock
            </span>
          ) : low ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/50 backdrop-blur">
              Low stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/50 backdrop-blur">
              Healthy
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Variant
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">
          {row.product_variants?.name ?? "—"}
        </h3>
        <p className="mt-1 line-clamp-2 text-[13px] font-medium text-slate-500">
          {row.product_variants?.products?.name ?? "—"}
        </p>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Central stock
          </p>
          <p
            className={`mt-0.5 text-2xl font-bold tabular-nums ${
              critical ? "text-rose-600" : low ? "text-amber-700" : "text-slate-900"
            }`}
          >
            {stock.toLocaleString("en-IN")}
            <span className="ml-1 text-[12px] font-medium text-slate-500">units</span>
          </p>
        </div>

        <p className="mt-2 text-[11px] font-medium text-slate-400">
          {row.updated_at
            ? `Updated ${format(new Date(row.updated_at), "MMM d, yyyy · h:mm a")}`
            : "No update timestamp"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-1 min-w-[8rem] items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Pencil className="size-3.5" />
            Adjust stock
          </button>
          {productId ? (
            <Link
              href={`/admin/products/${productId}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[color:var(--brand)] ring-1 ring-[color:var(--brand)]/20 transition hover:bg-[color:var(--brand)]/5"
              style={{ ["--brand" as string]: BRAND }}
            >
              Product
              <ExternalLink className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function InventoryPanel({
  inventory,
  total,
  page,
  stats,
}: {
  inventory: InventoryWithVariant[];
  total: number;
  page: number;
  stats: InventoryCatalogStats;
}) {
  const [selected, setSelected] = useState<InventoryWithVariant | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((row) => {
      const v = (row.product_variants?.name ?? "").toLowerCase();
      const p = (row.product_variants?.products?.name ?? "").toLowerCase();
      return v.includes(q) || p.includes(q);
    });
  }, [inventory, search]);

  const isFiltering = search.trim().length > 0;
  const healthyPct =
    stats.totalSkus > 0 ? (stats.healthySkus / stats.totalSkus) * 100 : 0;

  return (
    <>
      <AnimatePresence>
        {selected && (
          <Modal title="Override Stock" onClose={() => setSelected(null)} size="sm">
            <StockOverrideModal row={selected} onClose={() => setSelected(null)} />
          </Modal>
        )}
      </AnimatePresence>

      <div className="space-y-6 lg:space-y-7">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Central inventory
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
            Variant-level stock in the warehouse. Override counts when reconciling
            receipts or corrections.
          </p>
        </header>

        <section aria-label="Inventory summary">
          <SectionEyebrow
            icon={Sparkles}
            trailing={
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Warehouse · live
              </span>
            }
          >
            At a glance
          </SectionEyebrow>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Tracked SKUs"
              value={stats.totalSkus.toLocaleString("en-IN")}
              icon={Package}
              tint="linear-gradient(135deg, #e0e7ff, #c7d2fe)"
              delta={
                <TrendChip tone="neutral">
                  Rows in central inventory
                </TrendChip>
              }
            />
            <KpiCard
              label="Healthy (≥10)"
              value={stats.healthySkus.toLocaleString("en-IN")}
              icon={Warehouse}
              tint="linear-gradient(135deg, #d1fae5, #a7f3d0)"
              delta={
                <TrendChip tone={stats.healthySkus > 0 ? "up" : "neutral"}>
                  {Math.round(healthyPct)}% of SKUs
                </TrendChip>
              }
            >
              <InlineRail
                pct={healthyPct}
                label="Healthy share"
                value={`${stats.healthySkus} / ${stats.totalSkus}`}
                gradient={
                  healthyPct >= 60 ? RAIL_OK : healthyPct < 25 ? RAIL_DANGER : RAIL_WARN
                }
              />
            </KpiCard>
            <KpiCard
              label="Low (1–9)"
              value={stats.lowStockSkus.toLocaleString("en-IN")}
              icon={AlertTriangle}
              tint="linear-gradient(135deg, #fef9c3, #fde68a)"
              delta={
                <TrendChip tone={stats.lowStockSkus > 0 ? "down" : "neutral"}>
                  Needs attention soon
                </TrendChip>
              }
            />
            <KpiCard
              label="Critical"
              value={stats.criticalSkus.toLocaleString("en-IN")}
              icon={AlertTriangle}
              tint="linear-gradient(135deg, #ffe4e6, #fecdd3)"
              delta={
                <TrendChip tone={stats.criticalSkus > 0 ? "down" : "neutral"}>
                  Zero or unset stock
                </TrendChip>
              }
            />
          </div>
        </section>

        <section aria-label="Stock rows">
          <SectionEyebrow
            icon={Warehouse}
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
                  placeholder="Search variants…"
                  className="h-9 w-44 rounded-xl border border-slate-200/70 bg-white pl-8 pr-3 text-[12.5px] font-medium text-slate-700 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[color:var(--brand)]/40 focus:ring-2 focus:ring-[color:var(--brand)]/20 sm:w-56"
                  style={{ ["--brand" as string]: BRAND }}
                />
              </label>
            }
          >
            {isFiltering
              ? `${filtered.length} of ${inventory.length} on this page`
              : `Ledger · page ${page + 1}`}
          </SectionEyebrow>

          {filtered.length === 0 ? (
            <div
              className={`flex flex-col items-center gap-3 px-6 py-16 text-center ${CARD}`}
            >
              <Warehouse className="size-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                {isFiltering
                  ? "No rows match your search."
                  : "No inventory records yet."}
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
              {filtered.map((row) => (
                <InventoryRowCard
                  key={row.variant_id}
                  row={row}
                  onEdit={() => setSelected(row)}
                />
              ))}
            </div>
          )}

          {!isFiltering && total > inventory.length ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
              <Pagination total={total} page={page} basePath="/admin/inventory" />
            </div>
          ) : null}
        </section>

        <footer className="pt-1 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
          BuyHub · Inventory & catalog
        </footer>
      </div>
    </>
  );
}
