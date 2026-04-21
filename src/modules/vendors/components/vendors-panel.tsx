"use client";

import { useMemo, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Building2,
  Ban,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  Sparkles,
  Package,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import type { Vendor, VendorCatalogStats } from "@/common/admin/types";
import {
  createVendorAction,
  deleteVendorAction,
  updateVendorAction,
  toggleVendorAction,
} from "@/modules/vendors/actions/vendors.actions";
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

const VENDOR_TINTS = [
  "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
  "linear-gradient(135deg, #fce8ec, #e9b8c4)",
  "linear-gradient(135deg, #d1fae5, #a7f3d0)",
  "linear-gradient(135deg, #fef9c3, #fde68a)",
  "linear-gradient(135deg, #ede9fe, #ddd6fe)",
  "linear-gradient(135deg, #cffafe, #a5f3fc)",
];

function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return VENDOR_TINTS[h % VENDOR_TINTS.length];
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
const RAIL_MUTED = "linear-gradient(90deg, #e2e8f0, #cbd5e1)";

function VendorForm({
  vendor,
  onClose,
}: {
  vendor?: Vendor;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const contact = (fd.get("contact") as string).trim();
    if (!name) return setError("Name is required.");
    setError(null);
    startTransition(async () => {
      try {
        if (vendor) {
          await updateVendorAction(vendor.id, { name, contact });
        } else {
          await createVendorAction({ name, contact });
        }
        void queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldLabel label="Vendor Name">
        <input
          className={inputCls}
          name="name"
          defaultValue={vendor?.name ?? ""}
          placeholder="e.g. Fresh Farms Co."
          required
        />
      </FieldLabel>
      <FieldLabel label="Contact">
        <input
          className={inputCls}
          name="contact"
          defaultValue={vendor?.contact ?? ""}
          placeholder="Phone or email"
        />
      </FieldLabel>
      <FormError message={error} />
      <div className="flex justify-end gap-2 pt-1">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending}>
          {isPending ? "Saving…" : vendor ? "Save Changes" : "Create Vendor"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function VendorCard({
  vendor,
  isPending,
  onEdit,
  onToggle,
  onDelete,
}: {
  vendor: Vendor;
  isPending: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const tint = tintFor(vendor.id);
  const active = vendor.is_active ?? false;
  const initial = (vendor.name?.trim()?.charAt(0) ?? "?").toUpperCase();

  return (
    <div
      className={`group ${CARD} flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]`}
    >
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-slate-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          style={{ background: tint }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-20 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-3xl font-bold text-slate-600 shadow-sm">
            {initial}
          </span>
        </div>
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 backdrop-blur ${
              active
                ? "bg-emerald-50/90 text-emerald-800 ring-emerald-500/15"
                : "bg-white/80 text-slate-600 ring-slate-200/60"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
          {vendor.name ?? "Unnamed vendor"}
        </h3>
        <p className="mt-1 line-clamp-2 text-[13px] font-medium text-slate-500">
          {vendor.contact?.trim() ? vendor.contact : "No contact on file"}
        </p>
        {vendor.created_at ? (
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            Added {format(new Date(vendor.created_at), "MMM d, yyyy")}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link
            href={`/admin/vendors/${vendor.id}`}
            className="group/primary flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.45)] transition hover:shadow-[0_10px_22px_-6px_rgba(37,99,235,0.5)]"
            style={{
              background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
            }}
          >
            View
            <ArrowRight className="size-3.5 transition-transform group-hover/primary:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={onEdit}
            title="Edit vendor"
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onToggle}
            title={active ? "Deactivate" : "Activate"}
            className={`flex size-9 items-center justify-center rounded-xl border transition disabled:opacity-50 ${
              active
                ? "border-emerald-200/80 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-50"
                : "border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {active ? (
              <ToggleRight className="size-4" />
            ) : (
              <ToggleLeft className="size-4" />
            )}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onDelete}
            title="Delete vendor"
            className="flex size-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50/80 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function VendorsPanel({
  vendors,
  total,
  page,
  stats,
}: {
  vendors: Vendor[];
  total: number;
  page: number;
  stats: VendorCatalogStats;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<"create" | Vendor | null>(null);
  const [search, setSearch] = useState("");

  function handleToggle(vendor: Vendor) {
    startTransition(async () => {
      await toggleVendorAction(vendor.id, !vendor.is_active);
      void queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
    });
  }

  function handleDelete(vendor: Vendor) {
    if (!confirm(`Delete vendor "${vendor.name ?? "vendor"}"?`)) return;
    startTransition(async () => {
      try {
        await deleteVendorAction(vendor.id);
        void queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not delete vendor.");
      }
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => {
      const name = (v.name ?? "").toLowerCase();
      const contact = (v.contact ?? "").toLowerCase();
      return name.includes(q) || contact.includes(q);
    });
  }, [vendors, search]);

  const isFiltering = search.trim().length > 0;
  const activePct = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;

  return (
    <>
      <AnimatePresence>
        {modal && (
          <Modal
            title={modal === "create" ? "New Vendor" : "Edit Vendor"}
            onClose={() => setModal(null)}
            size="sm"
          >
            <VendorForm
              key={modal === "create" ? "create" : modal.id}
              vendor={modal === "create" ? undefined : modal}
              onClose={() => setModal(null)}
            />
          </Modal>
        )}
      </AnimatePresence>

      <div className="space-y-6 lg:space-y-7">
        <header className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Vendors
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
              Partners, contacts, and supply lines — onboard and maintain your network.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal("create")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.5)] transition hover:shadow-[0_14px_28px_-8px_rgba(37,99,235,0.55)]"
            style={{
              background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
            }}
          >
            <Plus className="size-4" />
            New vendor
          </button>
        </header>

        <section aria-label="Vendor network summary">
          <SectionEyebrow
            icon={Sparkles}
            trailing={
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Network · live
              </span>
            }
          >
            At a glance
          </SectionEyebrow>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total vendors"
              value={stats.total.toLocaleString("en-IN")}
              icon={Building2}
              tint="linear-gradient(135deg, #e0e7ff, #c7d2fe)"
              delta={
                <TrendChip tone="neutral">
                  {stats.supplyLines.toLocaleString("en-IN")} supply lines listed
                </TrendChip>
              }
            />
            <KpiCard
              label="Active"
              value={stats.active.toLocaleString("en-IN")}
              icon={Building2}
              tint="linear-gradient(135deg, #d1fae5, #a7f3d0)"
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  <TrendChip tone={activePct >= 50 ? "up" : "neutral"}>
                    {Math.round(activePct)}% of network
                  </TrendChip>
                  {stats.inactive > 0 ? (
                    <TrendChip tone="neutral">
                      {stats.inactive.toLocaleString("en-IN")} paused
                    </TrendChip>
                  ) : null}
                </div>
              }
            >
              <InlineRail
                pct={activePct}
                label="Active share"
                value={`${stats.active} / ${stats.total}`}
                gradient={
                  activePct >= 70 ? RAIL_OK : activePct < 30 ? RAIL_WARN : RAIL_MUTED
                }
              />
            </KpiCard>
            <KpiCard
              label="Paused"
              value={stats.inactive.toLocaleString("en-IN")}
              icon={Ban}
              tint="linear-gradient(135deg, #e2e8f0, #cbd5e1)"
              delta={
                <TrendChip tone="neutral">
                  Inactive vendor records
                </TrendChip>
              }
            />
            <KpiCard
              label="Supply lines"
              value={stats.supplyLines.toLocaleString("en-IN")}
              icon={Package}
              tint="linear-gradient(135deg, #fce8ec, #e9b8c4)"
              delta={
                <TrendChip tone="neutral">
                  Variant offers across vendors
                </TrendChip>
              }
            />
          </div>
        </section>

        <section aria-label="Vendors">
          <SectionEyebrow
            icon={Building2}
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
                  placeholder="Search vendors…"
                  className="h-9 w-44 rounded-xl border border-slate-200/70 bg-white pl-8 pr-3 text-[12.5px] font-medium text-slate-700 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[color:var(--brand)]/40 focus:ring-2 focus:ring-[color:var(--brand)]/20 sm:w-56"
                  style={{ ["--brand" as string]: BRAND }}
                />
              </label>
            }
          >
            {isFiltering
              ? `${filtered.length} of ${vendors.length} on this page`
              : `Directory · page ${page + 1}`}
          </SectionEyebrow>

          {filtered.length === 0 ? (
            <div
              className={`flex flex-col items-center gap-3 px-6 py-16 text-center ${CARD}`}
            >
              <Building2 className="size-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                {isFiltering
                  ? "No vendors match your search."
                  : "No vendors yet."}
              </p>
              {isFiltering ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModal("create")}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.5)] transition hover:shadow-[0_12px_24px_-8px_rgba(37,99,235,0.55)]"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
                  }}
                >
                  <Plus className="size-4" />
                  Add your first vendor
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((v) => (
                <VendorCard
                  key={v.id}
                  vendor={v}
                  isPending={isPending}
                  onEdit={() => setModal(v)}
                  onToggle={() => handleToggle(v)}
                  onDelete={() => handleDelete(v)}
                />
              ))}
            </div>
          )}

          {!isFiltering && total > vendors.length ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
              <Pagination total={total} page={page} basePath="/admin/vendors" />
            </div>
          ) : null}
        </section>

        <footer className="pt-1 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
          BuyHub · Vendor directory
        </footer>
      </div>
    </>
  );
}
