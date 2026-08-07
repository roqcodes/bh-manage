"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Layers,
  Loader2,
  Package,
  Plus,
  Trash2,
} from "lucide-react";

import type { Brand, Category, ProductVariant, ProductWithCategory } from "@/common/admin/types";
import { formatCategoryOptionLabel } from "@/modules/products/lib/categories.utils";
import {
  createProductAction,
  updateProductAction,
} from "@/modules/products/actions/products.actions";
import {
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
} from "@/modules/products/actions/variants.actions";
import { Button } from "@/components/ui/button";
import {
  Modal,
  FormError,
  PrimaryBtn,
  SecondaryBtn,
} from "@/modules/admin/components/modal";
import { VariantImagesField } from "@/modules/products/components/variant-images-field";
import { VariantImagesManager } from "@/modules/products/components/variant-images-manager";
import { adminGetNullable } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const BRAND = "#2563EB";

type StepId = "details" | "variants" | "review";

type ProductDetailPayload = {
  product: ProductWithCategory;
  variants: ProductVariant[];
};

type ProductDraft = {
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
};

type VariantDraft = {
  localId: string;
  name: string;
  price: number;
  mrp: number;
  imageUrls: string[];
  previewIndex: number;
};

const DEFAULT_SKU_NAME = "Default";
const EDIT_VARIANT_FORM_ID = "edit-variant-form";
const NEW_VARIANT_FORM_ID = "new-variant-form";

/** Shared height for the two detail-step panels. */
const compactInputCls =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50";

const compactSelectCls = `${compactInputCls} cursor-pointer`;

const compactTextareaCls =
  "min-h-[52px] w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:opacity-50";

function CompactField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function emptyProductDraft(product?: ProductWithCategory): ProductDraft {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.category_id ?? null,
    brandId: product?.brand_id ?? null,
  };
}

function productDraftFromProduct(product: ProductWithCategory): ProductDraft {
  return {
    name: product.name ?? "",
    description: product.description ?? "",
    categoryId: product.category_id ?? null,
    brandId: product.brand_id ?? null,
  };
}

function emptyVariantDraft(name = DEFAULT_SKU_NAME): VariantDraft {
  return {
    localId: newLocalId(),
    name,
    price: 0,
    mrp: 0,
    imageUrls: [],
    previewIndex: 0,
  };
}

function isPricingValid(price: number, mrp: number): boolean {
  return (
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(mrp) &&
    mrp >= 0
  );
}

function catalogImageFromVariants(drafts: VariantDraft[]): string | null {
  for (const draft of drafts) {
    const url = orderedImages(draft.imageUrls, draft.previewIndex)[0];
    if (url) return url;
  }
  return null;
}

function catalogImageFromVariantRows(variants: ProductVariant[]): string | null {
  for (const variant of variants) {
    const url = variant.images?.[0]?.url;
    if (url) return url;
  }
  return null;
}

function formatPriceRange(drafts: VariantDraft[]): string {
  const prices = drafts.map((d) => d.price).filter((p) => p > 0);
  if (prices.length === 0) return "—";
  if (prices.length === 1) return formatInr(prices[0]!);
  return `${formatInr(Math.min(...prices))} – ${formatInr(Math.max(...prices))}`;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function moneyInputValue(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return roundMoney2(Number(n)).toFixed(2);
}

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function newLocalId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function orderedImages(images: string[], previewIndex: number) {
  if (previewIndex > 0 && previewIndex < images.length) {
    return [images[previewIndex], ...images.filter((_, i) => i !== previewIndex)];
  }
  return images;
}

async function syncProductCatalogImage(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
) {
  const detail = await adminGetNullable<ProductDetailPayload>(`products/${productId}`);
  if (!detail?.product) return;
  await updateProductAction(productId, {
    name: detail.product.name ?? "",
    description: detail.product.description ?? "",
    categoryId: detail.product.category_id,
    brandId: detail.product.brand_id,
    imageUrl: catalogImageFromVariantRows(detail.variants ?? []),
  });
  await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
}

const CREATE_STEPS: { id: StepId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "details", label: "Details", icon: Package },
  { id: "variants", label: "Variants", icon: Layers },
  { id: "review", label: "Preview", icon: ClipboardCheck },
];

const EDIT_STEPS: { id: StepId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "details", label: "Details", icon: Package },
  { id: "variants", label: "Variants", icon: Layers },
];

function StepProgress({
  steps,
  currentIndex,
  maxReachableIndex,
  onStepClick,
}: {
  steps: typeof CREATE_STEPS;
  currentIndex: number;
  maxReachableIndex: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Product setup progress"
      className="shrink-0 border-b border-slate-100 bg-white px-8 py-5"
      style={{ ["--brand" as string]: BRAND }}
    >
      <ol className="flex w-full items-center">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const reachable = i <= maxReachableIndex;
          const isLast = i === steps.length - 1;
          const Icon = step.icon;
          const connectorFilled = i < currentIndex;

          return (
            <li
              key={step.id}
              className={`flex items-center ${isLast ? "shrink-0" : "min-w-0 flex-1"}`}
            >
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(i)}
                aria-current={active ? "step" : undefined}
                className={`group flex shrink-0 items-center gap-3 rounded-xl px-1 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/30 disabled:cursor-not-allowed ${
                  reachable ? "cursor-pointer" : "cursor-not-allowed opacity-45"
                }`}
              >
                <span
                  className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    active
                      ? "scale-105 border-[color:var(--brand)] bg-[color:var(--brand)] text-white shadow-[0_4px_16px_-4px_rgba(37,99,235,0.55)]"
                      : done
                        ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                        : "border-slate-200 bg-white text-slate-400 group-hover:border-slate-300"
                  }`}
                >
                  {done ? (
                    <Check className="size-4" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Icon className="size-4" aria-hidden />
                  )}
                  {active ? (
                    <span
                      className="absolute -inset-1 rounded-full border-2 border-[color:var(--brand)]/25"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-[0.16em] ${
                      active ? "text-[color:var(--brand)]" : done ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Step {i + 1}
                  </span>
                  <span
                    className={`block truncate text-[13px] font-bold tracking-tight ${
                      active ? "text-slate-950" : done ? "text-slate-700" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </span>
              </button>

              {!isLast ? (
                <div
                  className="relative mx-4 h-[3px] min-w-[40px] flex-1 overflow-hidden rounded-full bg-slate-200/90"
                  aria-hidden
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--brand)]"
                    initial={false}
                    animate={{ width: connectorFilled ? "100%" : active ? "35%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function VariantThumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="flex size-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-slate-300">
        <Package strokeWidth={1.5} className="size-5" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="size-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}

/* ── Variant split layout (list left, editor right) ── */

function VariantSplitLayout({
  list,
  panel,
}: {
  list: ReactNode;
  panel: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
      <aside className="flex w-[280px] shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        {list}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        {panel}
      </div>
    </div>
  );
}

function VariantListItem({
  name,
  price,
  mrp,
  thumbUrl,
  selected,
  onClick,
}: {
  name: string;
  price: number;
  mrp: number;
  thumbUrl: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 ${
        selected
          ? "border-l-2 border-l-[#2563EB] bg-[#2563EB]/[0.05]"
          : "border-l-2 border-l-transparent hover:bg-slate-50"
      }`}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-slate-200/70 bg-slate-50">
        <VariantThumb url={thumbUrl} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-900">{name || "Unnamed SKU"}</p>
        <p className="text-[11px] font-medium tabular-nums text-slate-500">
          {price > 0 ? formatInr(price) : "No price"}
          {mrp > 0 ? (
            <span className="ml-1.5 text-slate-400 line-through">{formatInr(mrp)}</span>
          ) : null}
        </p>
      </div>
    </button>
  );
}

function DraftVariantEditor({
  draft,
  onChange,
  onRemove,
  canRemove,
}: {
  draft: VariantDraft;
  onChange: (next: VariantDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const preview = draft.imageUrls[draft.previewIndex] ?? draft.imageUrls[0] ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900">Edit SKU</p>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          title={canRemove ? "Remove SKU" : "At least one SKU required"}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-100 bg-rose-50/80 px-2.5 text-[11px] font-bold text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="size-3" />
          Remove
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50">
          <VariantThumb url={preview} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <CompactField label="Variant name">
            <input
              className={compactInputCls}
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="e.g. 128 GB, Red / Large"
            />
          </CompactField>
          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Price (₹)">
              <input
                className={compactInputCls}
                type="number"
                step="0.01"
                min="0.01"
                required
                value={draft.price || ""}
                onChange={(e) =>
                  onChange({ ...draft, price: parseFloat(e.target.value) || 0 })
                }
                placeholder="Required"
              />
            </CompactField>
            <CompactField label="MRP (₹)">
              <input
                className={compactInputCls}
                type="number"
                step="0.01"
                min="0"
                value={draft.mrp || ""}
                onChange={(e) =>
                  onChange({ ...draft, mrp: parseFloat(e.target.value) || 0 })
                }
                placeholder="Optional"
              />
            </CompactField>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-slate-100 bg-slate-50/40 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          SKU images
        </p>
        <VariantImagesField
          images={draft.imageUrls}
          previewIndex={draft.previewIndex}
          onChange={(images, previewIndex) =>
            onChange({ ...draft, imageUrls: images, previewIndex })
          }
          compact
        />
      </div>
    </div>
  );
}

function DraftVariantCreatePanel({
  onAdd,
}: {
  onAdd: (draft: VariantDraft) => void;
}) {
  const [draft, setDraft] = useState<VariantDraft>(() => emptyVariantDraft(""));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
      <p className="mb-3 text-xs font-bold text-slate-900">New SKU</p>
      <div className="space-y-2">
        <CompactField label="Variant name">
          <input
            className={compactInputCls}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. 128 GB, Red / Large"
          />
        </CompactField>
        <div className="grid grid-cols-2 gap-2">
          <CompactField label="Price (₹)">
            <input
              className={compactInputCls}
              type="number"
              step="0.01"
              min="0.01"
              value={draft.price || ""}
              onChange={(e) =>
                setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })
              }
              placeholder="Required"
            />
          </CompactField>
          <CompactField label="MRP (₹)">
            <input
              className={compactInputCls}
              type="number"
              step="0.01"
              min="0"
              value={draft.mrp || ""}
              onChange={(e) => setDraft({ ...draft, mrp: parseFloat(e.target.value) || 0 })}
              placeholder="Optional"
            />
          </CompactField>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/40 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          SKU images
        </p>
        <VariantImagesField
          images={draft.imageUrls}
          previewIndex={draft.previewIndex}
          onChange={(images, previewIndex) =>
            setDraft({ ...draft, imageUrls: images, previewIndex })
          }
          compact
        />
      </div>

      <div className="mt-4 flex justify-end">
        <PrimaryBtn
          onClick={() => {
            if (!draft.name.trim() || !isPricingValid(draft.price, draft.mrp)) return;
            onAdd({ ...draft, localId: newLocalId() });
            setDraft(emptyVariantDraft(""));
          }}
          disabled={!draft.name.trim() || !isPricingValid(draft.price, draft.mrp)}
        >
          Add SKU
        </PrimaryBtn>
      </div>
    </div>
  );
}

function CreateVariantsStep({
  drafts,
  onChange,
}: {
  drafts: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => drafts[0]?.localId ?? null);

  useEffect(() => {
    if (selectedId && !drafts.some((d) => d.localId === selectedId)) {
      setSelectedId(drafts[0]?.localId ?? null);
    }
  }, [drafts, selectedId]);

  const selected = drafts.find((d) => d.localId === selectedId);

  function handleAdd(draft: VariantDraft) {
    onChange([...drafts, draft]);
    setSelectedId(draft.localId);
  }

  function handleRemove(localId: string) {
    const next = drafts.filter((d) => d.localId !== localId);
    onChange(next);
    setSelectedId(next[0]?.localId ?? null);
  }

  return (
    <VariantSplitLayout
      list={
        <>
          <div className="shrink-0 border-b border-slate-100 p-2">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                selectedId === null
                  ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Plus className="size-3.5" />
              New SKU
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {drafts.map((d) => (
              <li key={d.localId}>
                <VariantListItem
                  name={d.name}
                  price={d.price}
                  mrp={d.mrp}
                  thumbUrl={d.imageUrls[d.previewIndex] ?? d.imageUrls[0] ?? null}
                  selected={selectedId === d.localId}
                  onClick={() => setSelectedId(d.localId)}
                />
              </li>
            ))}
          </ul>
        </>
      }
      panel={
        selected ? (
          <DraftVariantEditor
            draft={selected}
            onChange={(next) =>
              onChange(drafts.map((d) => (d.localId === selected.localId ? next : d)))
            }
            onRemove={() => handleRemove(selected.localId)}
            canRemove={drafts.length > 1}
          />
        ) : (
          <DraftVariantCreatePanel onAdd={handleAdd} />
        )
      }
    />
  );
}

function ReviewStep({
  productDraft,
  variantDrafts,
  categories,
  brands,
}: {
  productDraft: ProductDraft;
  variantDrafts: VariantDraft[];
  categories: Category[];
  brands: Brand[];
}) {
  const categoryName =
    categories.find((c) => c.id === productDraft.categoryId)?.name ??
    "Uncategorized";
  const brandName =
    brands.find((b) => b.id === productDraft.brandId)?.name ?? null;

  const previewUrl = catalogImageFromVariants(variantDrafts);
  const skuCount = variantDrafts.length;
  const priceLabel = formatPriceRange(variantDrafts);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50">
              <VariantThumb url={previewUrl} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{productDraft.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {brandName ? `${brandName} · ` : ""}
                {categoryName}
              </p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-slate-700">{priceLabel}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {skuCount} SKU{skuCount !== 1 ? "s" : ""}
              </p>
              {productDraft.description ? (
                <p className="mt-1.5 line-clamp-3 text-xs leading-snug text-slate-600">
                  {productDraft.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
            {variantDrafts.map((v) => (
              <li key={v.localId} className="flex items-center gap-2.5 px-3 py-2">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-md border border-slate-200/70 bg-slate-50">
                  <VariantThumb url={v.imageUrls[v.previewIndex] ?? v.imageUrls[0] ?? null} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {v.name || "Unnamed SKU"}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums text-slate-500">
                    {v.price > 0 ? formatInr(v.price) : "—"}
                    {v.mrp > 0 ? (
                      <span className="ml-1.5 text-slate-400 line-through">
                        {formatInr(v.mrp)}
                      </span>
                    ) : null}
                    <span className="mx-1.5 text-slate-300">·</span>
                    {v.imageUrls.length} image{v.imageUrls.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Edit flow: live variant management ── */

function LiveVariantEditor({
  productId,
  variant,
  canDelete,
  onCatalogSync,
  onDeleted,
}: {
  productId: string;
  variant: ProductVariant;
  canDelete: boolean;
  onCatalogSync?: () => Promise<void>;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const images = variant.images ?? [];
  const preview = images[0]?.url ?? null;

  function handleDelete() {
    if (!canDelete) return;
    if (!confirm(`Delete variant "${variant.name ?? "variant"}"?`)) return;
    startTransition(async () => {
      await deleteVariantAction(variant.id, productId);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(productId),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      await onCatalogSync?.();
      onDeleted?.();
    });
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const price = roundMoney2(parseFloat(fd.get("price") as string));
    const mrp = roundMoney2(parseFloat(fd.get("mrp") as string));
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(mrp)) {
      return setError("Name and selling price greater than 0 are required.");
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateVariantAction(variant.id, productId, { name, price, mrp });
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(productId),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        await onCatalogSync?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
      <form id={EDIT_VARIANT_FORM_ID} onSubmit={handleUpdate} className="flex flex-col">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-900">Edit SKU</p>
          <button
            type="button"
            disabled={isPending || !canDelete}
            onClick={handleDelete}
            title={canDelete ? "Remove SKU" : "At least one SKU required"}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-100 bg-rose-50/80 px-2.5 text-[11px] font-bold text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3" />
            Remove
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50">
            <VariantThumb url={preview} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <CompactField label="Variant name">
              <input
                className={compactInputCls}
                name="name"
                defaultValue={variant.name ?? ""}
                required
              />
            </CompactField>
            <div className="grid grid-cols-2 gap-2">
              <CompactField label="Price (₹)">
                <input
                  className={compactInputCls}
                  name="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={moneyInputValue(variant.price)}
                  required
                />
              </CompactField>
              <CompactField label="MRP (₹)">
                <input
                  className={compactInputCls}
                  name="mrp"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={moneyInputValue(variant.mrp)}
                />
              </CompactField>
            </div>
          </div>
        </div>

        <FormError message={error} />
      </form>

      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-slate-100 bg-slate-50/40 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          SKU images
        </p>
        <VariantImagesManager
          productId={productId}
          variant={variant}
          onClose={() => {}}
          embedded
          compact
        />
      </div>
    </div>
  );
}

function NewVariantPanel({
  productId,
  onCreated,
  onCatalogSync,
}: {
  productId: string;
  onCreated?: () => void;
  onCatalogSync?: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const price = roundMoney2(parseFloat(fd.get("price") as string));
    const mrp = roundMoney2(parseFloat(fd.get("mrp") as string));
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(mrp) || mrp < 0) {
      return setError("Name and selling price greater than 0 are required.");
    }
    setError(null);
    startTransition(async () => {
      try {
        await createVariantAction(productId, {
          name,
          price,
          mrp,
          imageUrls: orderedImages(images, previewIndex),
        });
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(productId),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        await onCatalogSync?.();
        formRef.current?.reset();
        setImages([]);
        setPreviewIndex(0);
        onCreated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add variant.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      id={NEW_VARIANT_FORM_ID}
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900">New SKU</p>
        <button
          type="submit"
          disabled={isPending || imageUploading}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] px-3 text-xs font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {imageUploading ? "Uploading…" : isPending ? "Adding…" : "Add SKU"}
        </button>
      </div>
      <div className="space-y-2">
        <CompactField label="Variant name">
          <input className={compactInputCls} name="name" placeholder="e.g. 128 GB / Black" required />
        </CompactField>
        <div className="grid grid-cols-2 gap-2">
          <CompactField label="Price (₹)">
            <input className={compactInputCls} name="price" type="number" step="0.01" min="0.01" required />
          </CompactField>
          <CompactField label="MRP (₹)">
            <input className={compactInputCls} name="mrp" type="number" step="0.01" min="0" />
          </CompactField>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/40 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          SKU images
        </p>
        <VariantImagesField
          images={images}
          previewIndex={previewIndex}
          onChange={(next, preview) => {
            setImages(next);
            setPreviewIndex(preview);
          }}
          onUploadingChange={setImageUploading}
          compact
        />
      </div>

      <FormError message={error} />
    </form>
  );
}

function EditVariantsStep({
  productId,
  variants,
  isLoading,
  onCatalogSync,
  onFormIdChange,
}: {
  productId: string;
  variants: ProductVariant[];
  isLoading: boolean;
  onCatalogSync?: () => Promise<void>;
  onFormIdChange?: (formId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => variants[0]?.id ?? null);

  useEffect(() => {
    if (selectedId && !variants.some((v) => v.id === selectedId)) {
      setSelectedId(variants[0]?.id ?? null);
    }
  }, [variants, selectedId]);

  const selected = variants.find((v) => v.id === selectedId);

  useEffect(() => {
    onFormIdChange?.(selected ? EDIT_VARIANT_FORM_ID : NEW_VARIANT_FORM_ID);
  }, [selected, onFormIdChange]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-slate-400">
        <Loader2 className="size-6 animate-spin text-[color:var(--brand)]" style={{ ["--brand" as string]: BRAND }} />
        <p className="text-xs font-medium">Loading variants…</p>
      </div>
    );
  }

  return (
    <VariantSplitLayout
      list={
        <>
          <div className="shrink-0 border-b border-slate-100 p-2">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                selectedId === null
                  ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Plus className="size-3.5" />
              New SKU
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {variants.map((v) => {
              const imgs = v.images ?? [];
              return (
                <li key={v.id}>
                  <VariantListItem
                    name={v.name ?? ""}
                    price={v.price ?? 0}
                    mrp={v.mrp ?? 0}
                    thumbUrl={imgs[0]?.url ?? null}
                    selected={selectedId === v.id}
                    onClick={() => setSelectedId(v.id)}
                  />
                </li>
              );
            })}
          </ul>
        </>
      }
      panel={
        selected ? (
          <LiveVariantEditor
            key={selected.id}
            productId={productId}
            variant={selected}
            canDelete={variants.length > 1}
            onCatalogSync={onCatalogSync}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <NewVariantPanel productId={productId} onCatalogSync={onCatalogSync} />
        )
      }
    />
  );
}

function DetailsStepForm({
  draft,
  categories,
  brands,
  onDraftChange,
  error,
}: {
  draft: ProductDraft;
  categories: Category[];
  brands: Brand[];
  onDraftChange: (next: ProductDraft) => void;
  error: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
      <div className="w-full space-y-3">
        <CompactField label="Product name">
          <input
            className={compactInputCls}
            value={draft.name}
            onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
            placeholder="e.g. Wireless Mouse"
            required
          />
        </CompactField>

        <CompactField label="Category">
          <select
            className={compactSelectCls}
            value={draft.categoryId ?? ""}
            onChange={(e) =>
              onDraftChange({ ...draft, categoryId: e.target.value || null })
            }
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCategoryOptionLabel(c, categories)}
              </option>
            ))}
          </select>
        </CompactField>

        <CompactField label="Brand">
          <select
            className={compactSelectCls}
            value={draft.brandId ?? ""}
            onChange={(e) =>
              onDraftChange({ ...draft, brandId: e.target.value || null })
            }
          >
            <option value="">None</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? "Unnamed"}
              </option>
            ))}
          </select>
        </CompactField>

        <CompactField label="Description">
          <textarea
            className={compactTextareaCls}
            value={draft.description}
            onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
            rows={4}
            placeholder="Product description for catalog and search"
          />
        </CompactField>

        {error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ProductManageModal({
  mode,
  product,
  categories,
  brands,
  onClose,
}: {
  mode: "create" | "edit";
  product?: ProductWithCategory;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const isCreate = mode === "create";

  const steps = isCreate ? CREATE_STEPS : EDIT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReachableIndex, setMaxReachableIndex] = useState(
    isCreate ? 0 : EDIT_STEPS.length - 1,
  );
  const [error, setError] = useState<string | null>(null);

  const [productDraft, setProductDraft] = useState<ProductDraft>(() =>
    emptyProductDraft(product),
  );
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [editFormId, setEditFormId] = useState(EDIT_VARIANT_FORM_ID);

  const productId = product?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: adminQueryKeys.productDetail(productId ?? ""),
    queryFn: () => adminGetNullable<ProductDetailPayload>(`products/${productId}`),
    enabled: !isCreate && Boolean(productId),
  });

  const variants = data?.variants ?? [];
  const currentStep = steps[stepIndex]?.id ?? "details";

  useEffect(() => {
    if (product && !isCreate) {
      setProductDraft(productDraftFromProduct(product));
    }
  }, [
    isCreate,
    product?.id,
    product?.name,
    product?.description,
    product?.category_id,
    product?.brand_id,
  ]);

  const detailsValid = productDraft.name.trim().length > 0;

  const variantsValid = useMemo(
    () =>
      variantDrafts.length >= 1 &&
      variantDrafts.every(
        (v) => v.name.trim().length > 0 && isPricingValid(v.price, v.mrp),
      ),
    [variantDrafts],
  );

  function goToStep(index: number) {
    if (index < 0 || index >= steps.length) return;
    setStepIndex(index);
    setMaxReachableIndex((m) => Math.max(m, index));
    setError(null);
  }

  function handleBack() {
    goToStep(stepIndex - 1);
  }

  function handleContinue() {
    setError(null);
    if (currentStep === "details") {
      if (!detailsValid) {
        setError("Product name is required.");
        return;
      }
      if (isCreate) {
        if (variantDrafts.length === 0) {
          setVariantDrafts([emptyVariantDraft()]);
        }
        goToStep(1);
        return;
      }
      startTransition(async () => {
        try {
          await updateProductAction(productId!, {
            name: productDraft.name.trim(),
            description: productDraft.description.trim(),
            categoryId: productDraft.categoryId,
            brandId: productDraft.brandId,
            imageUrl: catalogImageFromVariantRows(variants),
          });
          await queryClient.invalidateQueries({
            queryKey: adminQueryKeys.productDetail(productId!),
          });
          await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
          goToStep(1);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save.");
        }
      });
      return;
    }
    if (currentStep === "variants") {
      if (isCreate) {
        if (!variantsValid) {
          setError("Each SKU needs a name and a selling price greater than 0.");
          return;
        }
        goToStep(2);
      }
    }
  }

  function handleCreateAll() {
    if (!detailsValid) {
      setError("Product name is required.");
      goToStep(0);
      return;
    }
    if (!variantsValid) {
      setError("Each SKU needs a name and a selling price greater than 0.");
      goToStep(1);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const catalogImage = catalogImageFromVariants(variantDrafts);
        const id = await createProductAction({
          name: productDraft.name.trim(),
          description: productDraft.description.trim(),
          categoryId: productDraft.categoryId,
          brandId: productDraft.brandId,
          imageUrl: catalogImage,
        });

        for (const v of variantDrafts) {
          await createVariantAction(id, {
            name: v.name.trim() || DEFAULT_SKU_NAME,
            price: roundMoney2(v.price),
            mrp: roundMoney2(v.mrp),
            imageUrls: orderedImages(v.imageUrls, v.previewIndex),
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create product.");
      }
    });
  }

  const isLastStep = stepIndex === steps.length - 1;
  const showBack = stepIndex > 0;

  async function handleCatalogSync() {
    if (!productId) return;
    await syncProductCatalogImage(queryClient, productId);
  }

  return (
    <Modal
      title={isCreate ? "New product" : "Edit product"}
      subtitle={
        isCreate
          ? "Build your product in steps — everything saves on the final review."
          : (product?.name ?? "Update details and variants")
      }
      onClose={onClose}
      size="landscape"
      bareBody
    >
      <StepProgress
        steps={steps}
        currentIndex={stepIndex}
        maxReachableIndex={Math.max(maxReachableIndex, stepIndex)}
        onStepClick={goToStep}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {currentStep === "details" ? (
              <DetailsStepForm
                draft={productDraft}
                categories={categories}
                brands={brands}
                onDraftChange={setProductDraft}
                error={error}
              />
            ) : null}

            {currentStep === "variants" && isCreate ? (
              <CreateVariantsStep drafts={variantDrafts} onChange={setVariantDrafts} />
            ) : null}

            {currentStep === "variants" && !isCreate && productId ? (
              <EditVariantsStep
                productId={productId}
                variants={variants}
                isLoading={isLoading && !data}
                onCatalogSync={handleCatalogSync}
                onFormIdChange={setEditFormId}
              />
            ) : null}

            {currentStep === "review" && isCreate ? (
              <ReviewStep
                productDraft={productDraft}
                variantDrafts={variantDrafts}
                categories={categories}
                brands={brands}
              />
            ) : null}

            {(currentStep === "details" && error) ||
            (currentStep === "variants" && isCreate && error) ||
            (currentStep === "review" && isCreate && error) ? (
              <div className="shrink-0 border-t border-border bg-background px-6 py-3">
                <FormError message={error} />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-6 py-4">
        <div>
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isPending}
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
          ) : (
            <span />
          )}
        </div>

        <div className="flex items-center gap-2">
          <SecondaryBtn onClick={onClose} disabled={isPending}>
            Cancel
          </SecondaryBtn>

          {isCreate && isLastStep ? (
            <PrimaryBtn onClick={handleCreateAll} disabled={isPending}>
              {isPending ? "Creating…" : "Create product"}
            </PrimaryBtn>
          ) : !isLastStep ? (
            <PrimaryBtn
              onClick={handleContinue}
              disabled={
                isPending ||
                (currentStep === "details" && !detailsValid) ||
                (currentStep === "variants" && isCreate && !variantsValid)
              }
            >
              {isPending ? "Saving…" : "Continue"}
            </PrimaryBtn>
          ) : editFormId === EDIT_VARIANT_FORM_ID ? (
            <PrimaryBtn type="submit" form={editFormId} disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </PrimaryBtn>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
