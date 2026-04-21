"use client";

import { useMemo, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Building2,
  Sparkles,
  Warehouse,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import type { Vendor, VendorProductWithVariant, VariantWithProduct } from "@/common/admin/types";
import {
  assignVariantToVendorAction,
  updateVendorProductAction,
  removeVendorProductAction,
} from "@/modules/vendors/actions/vendor-products.actions";
import {
  updateVendorAction,
  toggleVendorAction,
} from "@/modules/vendors/actions/vendors.actions";
import {
  Modal,
  FieldLabel,
  FormError,
  PrimaryBtn,
  SecondaryBtn,
  inputCls,
  selectCls,
} from "@/modules/admin/components/modal";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const BRAND = "#2563EB";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

const VENDOR_TINTS = [
  "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
  "linear-gradient(135deg, #fce8ec, #e9b8c4)",
  "linear-gradient(135deg, #d1fae5, #a7f3d0)",
  "linear-gradient(135deg, #fef9c3, #fde68a)",
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

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tint,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tint: string;
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
    </div>
  );
}

function VendorEditForm({
  vendor,
  onClose,
}: {
  vendor: Vendor;
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
        await updateVendorAction(vendor.id, { name, contact });
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.vendorDetail(vendor.id),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
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
          defaultValue={vendor.name ?? ""}
          required
        />
      </FieldLabel>
      <FieldLabel label="Contact">
        <input
          className={inputCls}
          name="contact"
          defaultValue={vendor.contact ?? ""}
        />
      </FieldLabel>
      <FormError message={error} />
      <div className="flex justify-end gap-2 pt-1">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function AssignForm({
  vendorId,
  availableVariants,
  onClose,
}: {
  vendorId: string;
  availableVariants: VariantWithProduct[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const variantId = fd.get("variantId") as string;
    const basePrice = parseFloat(fd.get("basePrice") as string);
    const stock = parseInt(fd.get("stock") as string, 10);
    if (!variantId || Number.isNaN(basePrice) || Number.isNaN(stock)) {
      return setError("All fields are required.");
    }
    setError(null);
    startTransition(async () => {
      try {
        await assignVariantToVendorAction({ vendorId, variantId, basePrice, stock });
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.vendorDetail(vendorId),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
        await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldLabel label="Product Variant">
        <select name="variantId" className={selectCls} required>
          <option value="">Select variant…</option>
          {availableVariants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.products?.name ?? "—"} · {v.name}
            </option>
          ))}
        </select>
      </FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label="Base Price (₹)">
          <input
            className={inputCls}
            name="basePrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </FieldLabel>
        <FieldLabel label="Stock (units)">
          <input
            className={inputCls}
            name="stock"
            type="number"
            min="0"
            placeholder="0"
            required
          />
        </FieldLabel>
      </div>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending}>
          {isPending ? "Assigning…" : "Assign Variant"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function EditVPForm({
  vp,
  vendorId,
  onClose,
}: {
  vp: VendorProductWithVariant;
  vendorId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const basePrice = parseFloat(fd.get("basePrice") as string);
    const stock = parseInt(fd.get("stock") as string, 10);
    if (Number.isNaN(basePrice) || Number.isNaN(stock)) {
      return setError("Valid numbers required.");
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateVendorProductAction(vp.id, vendorId, { basePrice, stock });
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.vendorDetail(vendorId),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
        await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
        {vp.product_variants?.products?.name ?? "—"} · {vp.product_variants?.name ?? "—"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label="Base Price (₹)">
          <input
            className={inputCls}
            name="basePrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={vp.base_price}
            required
          />
        </FieldLabel>
        <FieldLabel label="Stock (units)">
          <input
            className={inputCls}
            name="stock"
            type="number"
            min="0"
            defaultValue={vp.stock ?? 0}
            required
          />
        </FieldLabel>
      </div>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function SupplyLineCard({
  vp,
  isPending,
  onEdit,
  onRemove,
}: {
  vp: VendorProductWithVariant;
  isPending: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const tint = "linear-gradient(135deg, #e0e7ff, #c7d2fe)";
  const stock = Math.max(0, Math.floor(Number(vp.stock ?? 0)));
  const low = stock < 10;

  return (
    <div
      className={`group ${CARD} flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.14]"
        style={{ background: tint }}
        aria-hidden
      />
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        Variant
      </p>
      <p className="relative mt-1 text-[15px] font-semibold leading-snug text-slate-900">
        {vp.product_variants?.name ?? "—"}
      </p>
      <p className="relative mt-0.5 text-[13px] font-medium text-slate-500">
        {vp.product_variants?.products?.name ?? "—"}
      </p>

      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Base price
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
            ₹{vp.base_price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Stock
          </p>
          <p
            className={`mt-0.5 text-lg font-bold tabular-nums ${low ? "text-amber-700" : "text-slate-900"}`}
          >
            {stock.toLocaleString("en-IN")}{" "}
            <span className="text-[12px] font-medium text-slate-500">units</span>
          </p>
        </div>
      </div>

      {low ? (
        <div className="relative mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50/80 px-2.5 py-1.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200/50">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          Low stock (under 10 units)
        </div>
      ) : null}

      <div className="relative mt-4 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Pencil className="size-3.5" />
          Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onRemove}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50/80 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-50"
          title="Remove supply line"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function VendorDetailPanel({
  vendor,
  vendorProducts,
  availableVariants,
}: {
  vendor: Vendor;
  vendorProducts: VendorProductWithVariant[];
  availableVariants: VariantWithProduct[];
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<
    "assign" | "editVendor" | VendorProductWithVariant | null
  >(null);

  function isVpModal(m: typeof modal): m is VendorProductWithVariant {
    return m !== null && typeof m === "object";
  }

  const metrics = useMemo(() => {
    let totalStock = 0;
    let lowStockLines = 0;
    for (const vp of vendorProducts) {
      const s = Math.max(0, Math.floor(Number(vp.stock ?? 0)));
      totalStock += s;
      if (s < 10) lowStockLines += 1;
    }
    return {
      lines: vendorProducts.length,
      totalStock,
      lowStockLines,
      assignable: availableVariants.length,
    };
  }, [vendorProducts, availableVariants]);

  function handleRemove(id: string) {
    if (!confirm("Remove this supply entry?")) return;
    startTransition(async () => {
      await removeVendorProductAction(id, vendor.id);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.vendorDetail(vendor.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleVendorAction(vendor.id, !vendor.is_active);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.vendorDetail(vendor.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
    });
  }

  const active = vendor.is_active ?? false;
  const tint = tintFor(vendor.id);
  const initial = (vendor.name?.trim()?.charAt(0) ?? "?").toUpperCase();
  const shortId = vendor.id.slice(0, 8).toUpperCase();

  return (
    <>
      <AnimatePresence>
        {modal === "assign" && (
          <Modal title="Assign Variant" onClose={() => setModal(null)}>
            <AssignForm
              vendorId={vendor.id}
              availableVariants={availableVariants}
              onClose={() => setModal(null)}
            />
          </Modal>
        )}
        {modal === "editVendor" && (
          <Modal title="Edit Vendor" onClose={() => setModal(null)} size="sm">
            <VendorEditForm vendor={vendor} onClose={() => setModal(null)} />
          </Modal>
        )}
        {isVpModal(modal) && (
          <Modal title="Edit Supply Entry" onClose={() => setModal(null)} size="sm">
            <EditVPForm vp={modal} vendorId={vendor.id} onClose={() => setModal(null)} />
          </Modal>
        )}
      </AnimatePresence>

      <div className="space-y-6 lg:space-y-7">
        <div className={`${CARD} overflow-hidden`}>
          <div className="grid gap-0 lg:grid-cols-[288px_1fr]">
            <div className="relative h-[200px] w-full shrink-0 overflow-hidden border-b border-slate-100 sm:h-[220px] lg:h-72 lg:w-72 lg:border-b-0 lg:border-e">
              <div
                className="absolute inset-0 opacity-[0.22]"
                style={{ background: tint }}
                aria-hidden
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-24 items-center justify-center rounded-2xl border border-white/60 bg-white/95 text-4xl font-bold text-slate-600 shadow-md">
                  {initial}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${
                      active
                        ? "bg-emerald-50/90 text-emerald-800 ring-emerald-500/15"
                        : "bg-slate-100/90 text-slate-600 ring-slate-200/60"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {active ? "Active" : "Paused"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {vendor.name ?? "Unnamed vendor"}
                </h1>
                {vendor.contact?.trim() ? (
                  <p className="mt-2 text-sm font-medium text-slate-600">{vendor.contact}</p>
                ) : (
                  <p className="mt-2 text-sm font-medium italic text-slate-400">
                    No contact on file.
                  </p>
                )}
                <p className="mt-3 font-mono text-[11px] font-medium text-slate-400">
                  ID · {shortId}…
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleToggle}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  {active ? (
                    <ToggleRight className="size-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="size-4 text-slate-400" />
                  )}
                  {active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setModal("editVendor")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Pencil className="size-3.5" />
                  Edit details
                </button>
                {availableVariants.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setModal("assign")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.5)] transition hover:shadow-[0_14px_28px_-8px_rgba(37,99,235,0.55)]"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
                    }}
                  >
                    <Plus className="size-4" />
                    Assign variant
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <section aria-label="Vendor summary">
          <SectionEyebrow
            icon={Sparkles}
            trailing={
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Supply · snapshot
              </span>
            }
          >
            At a glance
          </SectionEyebrow>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Supply lines"
              value={metrics.lines.toLocaleString("en-IN")}
              icon={Package}
              tint="linear-gradient(135deg, #e0e7ff, #c7d2fe)"
              delta={
                <TrendChip tone={metrics.lines > 0 ? "up" : "neutral"}>
                  Variants linked to this vendor
                </TrendChip>
              }
            />
            <KpiCard
              label="Listed stock"
              value={metrics.totalStock.toLocaleString("en-IN")}
              icon={Warehouse}
              tint="linear-gradient(135deg, #d1fae5, #a7f3d0)"
              delta={
                <TrendChip tone={metrics.totalStock > 0 ? "up" : "neutral"}>
                  Units across supply lines
                </TrendChip>
              }
            />
            <KpiCard
              label="Low stock lines"
              value={metrics.lowStockLines.toLocaleString("en-IN")}
              icon={AlertTriangle}
              tint="linear-gradient(135deg, #fef9c3, #fde68a)"
              delta={
                <TrendChip tone={metrics.lowStockLines > 0 ? "down" : "neutral"}>
                  Under 10 units on a line
                </TrendChip>
              }
            />
            <KpiCard
              label="Assignable variants"
              value={metrics.assignable.toLocaleString("en-IN")}
              icon={Building2}
              tint="linear-gradient(135deg, #fce8ec, #e9b8c4)"
              delta={
                <TrendChip tone="neutral">
                  Catalog SKUs not yet linked here
                </TrendChip>
              }
            />
          </div>
        </section>

        <section aria-label="Supply lines">
          <SectionEyebrow
            icon={Package}
            trailing={
              availableVariants.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setModal("assign")}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/8"
                  style={{ ["--brand" as string]: BRAND }}
                >
                  <Plus className="size-3" />
                  Assign variant
                </button>
              ) : null
            }
          >
            Supply lines · {vendorProducts.length}
          </SectionEyebrow>

          {vendorProducts.length === 0 ? (
            <div
              className={`flex flex-col items-center gap-3 px-6 py-16 text-center ${CARD}`}
            >
              <Package className="size-12 text-slate-200" />
              <p className="max-w-sm text-sm font-medium text-slate-500">
                No variants assigned yet. Link catalog SKUs with base price and stock.
              </p>
              {availableVariants.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setModal("assign")}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.5)] transition hover:shadow-[0_14px_28px_-8px_rgba(37,99,235,0.55)]"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
                  }}
                >
                  <Plus className="size-4" />
                  Assign first variant
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vendorProducts.map((vp) => (
                <SupplyLineCard
                  key={vp.id}
                  vp={vp}
                  isPending={isPending}
                  onEdit={() => setModal(vp)}
                  onRemove={() => handleRemove(vp.id)}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="pt-1 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
          BuyHub · Vendor detail
        </footer>
      </div>
    </>
  );
}
