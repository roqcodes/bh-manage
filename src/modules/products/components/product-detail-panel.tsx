"use client";

import { useEffect, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Layers,
  Tag,
  Leaf,
  Drumstick,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Warehouse,
} from "lucide-react";

import type {
  Category,
  ProductAtGlanceMetrics,
  ProductVariant,
  ProductWithCategory,
} from "@/common/admin/types";
import type { PricingRuleRow } from "@/modules/pricing/types";
import { ProductPricingSection } from "@/modules/products/components/product-pricing-section";
import {
  updateProductAction,
  toggleProductAction,
} from "@/modules/products/actions/products.actions";
import {
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
} from "@/modules/products/actions/variants.actions";
import {
  Modal,
  FieldLabel,
  FormError,
  PrimaryBtn,
  SecondaryBtn,
  inputCls,
  selectCls,
  textareaCls,
} from "@/modules/admin/components/modal";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const BRAND = "#2563EB";

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

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
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
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
    up: "bg-emerald-50/80 text-emerald-600/90 ring-emerald-500/[0.08]",
    down: "bg-rose-50/80 text-rose-600/90 ring-rose-500/[0.08]",
    neutral: "bg-slate-100/90 text-slate-600/90 ring-slate-900/[0.05]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${tones[tone]}`}
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
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <div className="mt-2 text-[28px] font-black leading-none tabular-nums tracking-tight text-slate-950 [&_*]:tabular-nums">
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

function ProductHeroImage({ url }: { url: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url?.trim() ?? "";
  useEffect(() => {
    setFailed(false);
  }, [trimmed]);
  if (!trimmed || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-slate-300">
        <Package strokeWidth={1.5} className="size-16" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt=""
      className="absolute inset-0 size-full object-cover object-center"
      onError={() => setFailed(true)}
    />
  );
}

/** Display and persist money amounts to 2 decimal places (paise). */
function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function moneyInputValue(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return roundMoney2(Number(n)).toFixed(2);
}

function VariantForm({
  productId,
  variant,
  onClose,
}: {
  productId: string;
  variant?: ProductVariant;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const price = roundMoney2(parseFloat(fd.get("price") as string));
    const mrp = roundMoney2(parseFloat(fd.get("mrp") as string));
    if (!name || !Number.isFinite(price) || !Number.isFinite(mrp)) {
      return setError("All fields required.");
    }
    setError(null);
    startTransition(async () => {
      try {
        if (variant) {
          await updateVariantAction(variant.id, productId, { name, price, mrp });
        } else {
          await createVariantAction(productId, { name, price, mrp });
        }
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(productId),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldLabel label="Variant Name (e.g. 500g, 1kg)">
        <input
          className={inputCls}
          name="name"
          defaultValue={variant?.name ?? ""}
          placeholder="e.g. 1 kg"
          required
        />
      </FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label="Selling Price (₹)">
          <input
            className={inputCls}
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={moneyInputValue(variant?.price)}
            required
          />
        </FieldLabel>
        <FieldLabel label="MRP (₹)">
          <input
            className={inputCls}
            name="mrp"
            type="number"
            step="0.01"
            min="0"
            defaultValue={moneyInputValue(variant?.mrp)}
            required
          />
        </FieldLabel>
      </div>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending}>
          {isPending ? "Saving…" : variant ? "Save" : "Add Variant"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function ProductEditForm({
  product,
  categories,
  onClose,
}: {
  product: ProductWithCategory;
  categories: Category[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(product.image_url?.trim() ?? "");
  const [previewBroken, setPreviewBroken] = useState(false);

  useEffect(() => {
    setImageUrl(product.image_url?.trim() ?? "");
    setPreviewBroken(false);
  }, [product.id, product.image_url]);

  useEffect(() => {
    setPreviewBroken(false);
  }, [imageUrl]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const description = (fd.get("description") as string).trim();
    const categoryId = (fd.get("categoryId") as string) || null;
    const isVeg = fd.get("isVeg") === "on";
    const imageUrlValue = imageUrl.trim() || null;
    if (!name) return setError("Name is required.");
    setError(null);
    startTransition(async () => {
      try {
        await updateProductAction(product.id, {
          name,
          description,
          categoryId,
          imageUrl: imageUrlValue,
          isVeg,
        });
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(product.id),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldLabel label="Product Name">
        <input className={inputCls} name="name" defaultValue={product.name ?? ""} required />
      </FieldLabel>
      <FieldLabel label="Image URL">
        <input
          className={inputCls}
          name="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          autoComplete="off"
        />
      </FieldLabel>
      {imageUrl.trim() ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
          <div className="shrink-0">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Preview
            </p>
            {!previewBroken ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white ring-1 ring-slate-100/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={imageUrl}
                  src={imageUrl.trim()}
                  alt=""
                  className="max-h-full max-w-full rounded-md object-contain"
                  onError={() => setPreviewBroken(true)}
                />
              </div>
            ) : (
              <p className="max-w-[10rem] text-[11px] font-medium leading-snug text-amber-700">
                Could not load. Check the URL.
              </p>
            )}
          </div>
        </div>
      ) : null}
      <FieldLabel label="Description">
        <textarea
          className={textareaCls}
          name="description"
          defaultValue={product.description ?? ""}
          rows={3}
        />
      </FieldLabel>
      <FieldLabel label="Category">
        <select name="categoryId" className={selectCls} defaultValue={product.category_id ?? ""}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FieldLabel>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          name="isVeg"
          defaultChecked={product.is_veg ?? false}
          className="h-4 w-4 accent-emerald-500"
        />
        Vegetarian
      </label>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function VariantCard({
  variant,
  isPending,
  onEdit,
  onDelete,
}: {
  variant: ProductVariant;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tint = "linear-gradient(135deg, #e0e7ff, #c7d2fe)";
  const price = variant.price ?? null;
  const mrp = variant.mrp ?? null;

  return (
    <div
      className={`group ${CARD} flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.14]"
        style={{ background: tint }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
            SKU
          </p>
          <p className="mt-1 line-clamp-2 text-[15px] font-black leading-snug tracking-tight text-slate-950">
            {variant.name ?? "Unnamed variant"}
          </p>
        </div>
        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/55 bg-white/90 shadow-sm">
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.4]"
            style={{ background: tint }}
            aria-hidden
          />
          <Package className="relative size-4 text-slate-600" aria-hidden />
        </span>
      </div>

      <div className="relative mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Selling price
          </p>
          <p className="text-[22px] font-black tabular-nums leading-none tracking-tight text-slate-950">
            {price != null ? `₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
          </p>
        </div>
        {mrp != null ? (
          <p className="pb-0.5 text-[12px] font-semibold tabular-nums text-slate-400 line-through decoration-slate-300">
            MRP ₹{mrp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        ) : null}
      </div>

      <div className="relative mt-4 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Pencil className="size-3.5" />
          Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onDelete}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50/80 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-50"
          title="Delete variant"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ProductDetailPanel({
  product,
  variants,
  categories,
  pricingRule,
  glance,
}: {
  product: ProductWithCategory;
  variants: ProductVariant[];
  categories: Category[];
  pricingRule: PricingRuleRow | null;
  glance: ProductAtGlanceMetrics;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<"editProduct" | "addVariant" | ProductVariant | null>(null);

  function isVariantModal(m: typeof modal): m is ProductVariant {
    return m !== null && typeof m === "object";
  }

  function handleDelete(variantId: string) {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteVariantAction(variantId, product.id);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(product.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleProductAction(product.id, !product.is_active);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(product.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  const isActive = product.is_active ?? false;
  const isVeg = product.is_veg ?? false;
  const shortId = product.id.slice(0, 8).toUpperCase();

  const livePriceValue =
    glance.livePriceMin == null ? (
      "—"
    ) : glance.livePriceMax != null &&
      Math.abs(glance.livePriceMax - glance.livePriceMin) > 0.005 ? (
      <span className="block leading-tight">
        <span className="block text-[22px] sm:text-[26px]">
          {formatInr(glance.livePriceMin)}
        </span>
        <span className="mt-0.5 block text-[13px] font-bold text-slate-500">
          to {formatInr(glance.livePriceMax)}
        </span>
      </span>
    ) : (
      formatInr(glance.livePriceMin)
    );

  return (
    <>
      <AnimatePresence>
        {modal === "editProduct" && (
          <Modal title="Edit Product" onClose={() => setModal(null)}>
            <ProductEditForm product={product} categories={categories} onClose={() => setModal(null)} />
          </Modal>
        )}
        {(modal === "addVariant" || isVariantModal(modal)) && (
          <Modal
            title={modal === "addVariant" ? "Add Variant" : "Edit Variant"}
            onClose={() => setModal(null)}
            size="sm"
          >
            <VariantForm
              productId={product.id}
              variant={isVariantModal(modal) ? modal : undefined}
              onClose={() => setModal(null)}
            />
          </Modal>
        )}
      </AnimatePresence>

      <div className="space-y-6 lg:space-y-7">
        {/* Hero */}
        <div className={`${CARD} overflow-hidden`}>
          <div className="grid gap-0 lg:grid-cols-[288px_1fr]">
            <div className="relative h-[200px] w-full shrink-0 overflow-hidden border-b border-slate-100 sm:h-[220px] lg:h-72 lg:w-72 lg:border-b-0 lg:border-e">
              <ProductHeroImage url={product.image_url} />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60 lg:bg-gradient-to-r"
                aria-hidden
              />
            </div>
            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${
                      isActive
                        ? "bg-emerald-50/90 text-emerald-700 ring-emerald-500/20"
                        : "bg-slate-100/90 text-slate-500 ring-slate-900/10"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${
                      isVeg
                        ? "bg-emerald-50/90 text-emerald-700 ring-emerald-500/20"
                        : "bg-rose-50/90 text-rose-700 ring-rose-500/20"
                    }`}
                  >
                    {isVeg ? <Leaf className="size-3" /> : <Drumstick className="size-3" />}
                    {isVeg ? "Veg" : "Non-veg"}
                  </span>
                  {product.categories?.name ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-800 ring-1 ring-sky-500/15">
                      <Tag className="size-3" />
                      {product.categories.name}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {product.name ?? "Untitled product"}
                </h1>
                {product.description ? (
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
                    {product.description}
                  </p>
                ) : (
                  <p className="mt-2 text-sm font-medium italic text-slate-400">
                    No description yet.
                  </p>
                )}
                <p className="mt-3 font-mono text-[11px] font-bold text-slate-400">
                  ID · {shortId}…
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleToggle}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-[12.5px] font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isActive ? (
                    <ToggleRight className="size-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="size-4 text-slate-400" />
                  )}
                  {isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setModal("editProduct")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-[12.5px] font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Pencil className="size-3.5" />
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={() => setModal("addVariant")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.55)] transition hover:shadow-[0_14px_28px_-8px_rgba(37,99,235,0.6)]"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
                  }}
                >
                  <Plus className="size-4" />
                  Add variant
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section aria-label="Product summary">
          <SectionEyebrow
            icon={Sparkles}
            trailing={
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Vendor + margin · central stock
              </span>
            }
          >
            At a glance
          </SectionEyebrow>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Variants"
              value={variants.length.toLocaleString("en-IN")}
              icon={Layers}
              tint="linear-gradient(135deg, #e0e7ff, #c7d2fe)"
              delta={
                <TrendChip tone={variants.length > 0 ? "up" : "neutral"}>
                  {variants.length > 0
                    ? `${variants.length} SKU${variants.length !== 1 ? "s" : ""} configured`
                    : "Add variants to sell"}
                </TrendChip>
              }
            />
            <KpiCard
              label="Category"
              value={
                <span className="line-clamp-2 text-left text-[22px] leading-tight sm:text-[26px]">
                  {product.categories?.name ?? "Uncategorized"}
                </span>
              }
              icon={Tag}
              tint="linear-gradient(135deg, #dbeafe, #bfdbfe)"
              delta={
                <TrendChip tone="neutral">
                  Catalog grouping
                </TrendChip>
              }
            />
            <KpiCard
              label="Live selling price"
              value={livePriceValue}
              icon={Sparkles}
              tint="linear-gradient(135deg, #fce8ec, #e9b8c4)"
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  {glance.livePriceMin != null ? (
                    <TrendChip tone="up">
                      {glance.variantsWithLivePrice}/{variants.length || 1} SKUs with
                      vendor stock · rule applied
                    </TrendChip>
                  ) : (
                    <TrendChip tone="neutral">
                      No in-stock vendor offers
                    </TrendChip>
                  )}
                </div>
              }
            />
            <KpiCard
              label="Central inventory"
              value={glance.centralStockTotal.toLocaleString("en-IN")}
              icon={Warehouse}
              tint="linear-gradient(135deg, #d1fae5, #a7f3d0)"
              delta={
                <TrendChip
                  tone={
                    glance.centralStockTotal > 0
                      ? "up"
                      : "down"
                  }
                >
                  {glance.centralStockTotal > 0
                    ? "Units in central warehouse"
                    : "No central stock on hand"}
                </TrendChip>
              }
            />
          </div>
        </section>

        {/* Variants */}
        <section aria-label="Variants">
          <SectionEyebrow
            icon={Package}
            trailing={
              <button
                type="button"
                onClick={() => setModal("addVariant")}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/8"
                style={{ ["--brand" as string]: BRAND }}
              >
                <Plus className="size-3" />
                New variant
              </button>
            }
          >
            Variants · {variants.length}
          </SectionEyebrow>

          {variants.length === 0 ? (
            <div
              className={`flex flex-col items-center gap-3 px-6 py-16 text-center ${CARD}`}
            >
              <Package className="size-12 text-slate-200" />
              <p className="max-w-sm text-sm font-semibold text-slate-500">
                No variants yet. Add at least one size or pack to make this product
                purchasable.
              </p>
              <button
                type="button"
                onClick={() => setModal("addVariant")}
                className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.55)] transition hover:shadow-[0_14px_28px_-8px_rgba(37,99,235,0.6)]"
                style={{
                  background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
                }}
              >
                <Plus className="size-4" />
                Add first variant
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {variants.map((v) => (
                <VariantCard
                  key={v.id}
                  variant={v}
                  isPending={isPending}
                  onEdit={() => setModal(v)}
                  onDelete={() => handleDelete(v.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Pricing */}
        <section aria-label="Pricing">
          <ProductPricingSection productId={product.id} initialRule={pricingRule} />
        </section>

        <footer className="pt-1 text-center text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-300">
          BuyHub · Product detail
        </footer>
      </div>
    </>
  );
}
