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

import type { Brand, Category, ProductImage, ProductVariant, ProductVideo, ProductWithCategory, VariantGroup } from "@/common/admin/types";
import type { ItemUnit } from "@/common/erp/types";
import { formatCategoryOptionLabel } from "@/modules/products/lib/categories.utils";
import { formatActionError } from "@/modules/admin/lib/format-action-error";
import { useAdminAction } from "@/modules/admin/hooks/use-admin-action";
import {
  createProductAction,
  updateProductAction,
} from "@/modules/products/actions/products.actions";
import {
  createVariantAction,
  createVariantGroupAction,
  saveGroupedVariantsAction,
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
import { ProductMediaField } from "@/modules/products/components/product-media-field";
import {
  GroupVariantsStep,
  emptyGroupDraft,
  emptyGroupSkuRow,
  isGroupDraftsValid,
  type GroupDraft,
} from "@/modules/products/components/group-variants-step";
import { adminGet, adminGetNullable } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import { currencyLabel, formatInr } from "@/lib/format-currency";
import { useCurrencySettings } from "@/modules/settings/providers/currency-settings-provider";

const BRAND = "#2563EB";

type StepId = "details" | "variants" | "review";

type ProductDetailPayload = {
  product: ProductWithCategory;
  variants: ProductVariant[];
  variant_groups?: VariantGroup[];
  product_images?: ProductImage[];
  product_videos?: ProductVideo[];
};

type ProductDraft = {
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  itemType: "goods" | "service";
  hsnSac: string;
  barcode: string;
  productCode: string;
  unitId: string | null;
  purchasePrice: number;
  taxRatePercent: number;
  markupPercent: number;
  defaultPrice: number;
  defaultMrp: number;
  imageUrls: string[];
  imagePreviewIndex: number;
  videoUrls: string[];
};

type SkuTab = "groups" | "variants";

type VariantDraft = {
  localId: string;
  name: string;
  price: number;
  mrp: number;
  stock: number;
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
    itemType: product?.item_type ?? "goods",
    hsnSac: product?.hsn_sac ?? "",
    barcode: "",
    productCode: "",
    unitId: null,
    purchasePrice: 0,
    taxRatePercent: 0,
    markupPercent: 0,
    defaultPrice: 0,
    defaultMrp: 0,
    imageUrls: product?.image_url ? [product.image_url] : [],
    imagePreviewIndex: 0,
    videoUrls: [],
  };
}

function productDraftFromProduct(product: ProductWithCategory): ProductDraft {
  return {
    name: product.name ?? "",
    description: product.description ?? "",
    categoryId: product.category_id ?? null,
    brandId: product.brand_id ?? null,
    itemType: product.item_type ?? "goods",
    hsnSac: product.hsn_sac ?? "",
    barcode: "",
    productCode: "",
    unitId: null,
    purchasePrice: 0,
    taxRatePercent: 0,
    markupPercent: 0,
    defaultPrice: 0,
    defaultMrp: 0,
    imageUrls: product.image_url ? [product.image_url] : [],
    imagePreviewIndex: 0,
    videoUrls: [],
  };
}

function defaultPricingFromVariants(variants: ProductVariant[]): {
  price: number;
  mrp: number;
} {
  const prices = variants
    .map((v) => Number(v.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  const mrps = variants
    .map((v) => Number(v.mrp))
    .filter((m) => Number.isFinite(m) && m >= 0);

  return {
    price: prices.length > 0 ? roundMoney2(Math.min(...prices)) : 0,
    mrp: mrps.length > 0 ? roundMoney2(Math.min(...mrps)) : 0,
  };
}

function productDraftFromDetail(
  product: ProductWithCategory,
  images: ProductImage[],
  videos: ProductVideo[],
  variants: ProductVariant[],
): ProductDraft {
  const sortedImages = [...images].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const imageUrls = sortedImages.map((i) => i.url).filter(Boolean);
  const previewIdx = sortedImages.findIndex((i) => i.is_preview);
  const sortedVideos = [...videos].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const { price: defaultPrice, mrp: defaultMrp } = defaultPricingFromVariants(variants);
  const primaryVariant = variants[0];

  return {
    name: product.name ?? "",
    description: product.description ?? "",
    categoryId: product.category_id ?? null,
    brandId: product.brand_id ?? null,
    itemType: product.item_type ?? "goods",
    hsnSac: product.hsn_sac ?? "",
    barcode: primaryVariant?.barcode ?? "",
    productCode: primaryVariant?.product_code ?? "",
    unitId: primaryVariant?.unit_id ?? null,
    purchasePrice: Number(primaryVariant?.purchase_price) || 0,
    taxRatePercent: Number(primaryVariant?.tax_rate_percent) || 0,
    markupPercent: Number(primaryVariant?.markup_percent) || 0,
    defaultPrice,
    defaultMrp,
    imageUrls:
      imageUrls.length > 0
        ? imageUrls
        : product.image_url
          ? [product.image_url]
          : [],
    imagePreviewIndex: previewIdx >= 0 ? previewIdx : 0,
    videoUrls: sortedVideos.map((v) => v.url).filter(Boolean),
  };
}

function variantRowFromApi(v: ProductVariant): GroupDraft["rows"][number] {
  return {
    localId: v.id,
    variantId: v.id,
    name: v.name ?? "",
    price: Number(v.price) || 0,
    mrp: Number(v.mrp) || 0,
    stock: v.central_stock ?? 0,
  };
}

function groupDraftsFromApi(
  groups: VariantGroup[],
  variants: ProductVariant[],
): GroupDraft[] {
  const sorted = [...groups].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (sorted.length === 0 && variants.length > 0) {
    return [
      {
        localId: newLocalId(),
        name: "Models",
        rows: variants.map((v) => variantRowFromApi(v)),
      },
    ];
  }

  const groupIds = new Set(sorted.map((g) => g.id));
  const sections: GroupDraft[] = sorted.map((g) => {
    const rows = variants
      .filter((v) => v.variant_group_id === g.id)
      .map((v) => variantRowFromApi(v));
    return {
      localId: g.id,
      name: g.name ?? "",
      rows: rows.length > 0 ? rows : [emptyGroupSkuRow()],
    };
  });

  const ungrouped = variants.filter(
    (v) => !v.variant_group_id || !groupIds.has(v.variant_group_id),
  );
  if (ungrouped.length > 0) {
    if (sections.length > 0) {
      sections[0] = {
        ...sections[0]!,
        rows: [...sections[0]!.rows, ...ungrouped.map((v) => variantRowFromApi(v))],
      };
    } else {
      sections.push({
        localId: newLocalId(),
        name: "Models",
        rows: ungrouped.map((v) => variantRowFromApi(v)),
      });
    }
  }

  return sections;
}

function variantDraftsFromApi(variants: ProductVariant[]): VariantDraft[] {
  return variants.map((v) => {
    const images = v.images ?? [];
    const previewIdx = images.findIndex((img) => img.is_preview);
    return {
      localId: v.id,
      name: v.name ?? "",
      price: Number(v.price) || 0,
      mrp: Number(v.mrp) || 0,
      stock: v.central_stock ?? 0,
      imageUrls: images.map((img) => img.url).filter(Boolean),
      previewIndex: previewIdx >= 0 ? previewIdx : 0,
    };
  });
}

function catalogImageFromProductDraft(draft: ProductDraft): string | null {
  const url = orderedImages(draft.imageUrls, draft.imagePreviewIndex)[0];
  return url ?? null;
}

function emptyVariantDraft(name = DEFAULT_SKU_NAME): VariantDraft {
  return {
    localId: newLocalId(),
    name,
    price: 0,
    mrp: 0,
    stock: 0,
    imageUrls: [],
    previewIndex: 0,
  };
}

function parseStockInput(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isPricingValid(price: number, mrp: number, showMrp = true): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  if (!showMrp) return true;
  return Number.isFinite(mrp) && mrp >= 0;
}

function applyGroupDefaults(groups: GroupDraft[], draft: ProductDraft): GroupDraft[] {
  return groups.map((g) => ({
    ...g,
    rows: g.rows.map((r) => ({
      ...r,
      price: r.price > 0 ? r.price : draft.defaultPrice,
      mrp: r.mrp > 0 ? r.mrp : draft.defaultMrp,
    })),
  }));
}

function applyVariantDefaults(drafts: VariantDraft[], draft: ProductDraft): VariantDraft[] {
  return drafts.map((v) => ({
    ...v,
    price: v.price > 0 ? v.price : draft.defaultPrice,
    mrp: v.mrp > 0 ? v.mrp : draft.defaultMrp,
  }));
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

function newLocalId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function orderedImages(images: string[], previewIndex: number) {
  if (previewIndex > 0 && previewIndex < images.length) {
    return [images[previewIndex], ...images.filter((_, i) => i !== previewIndex)];
  }
  return images;
}

function cloneProductDraft(draft: ProductDraft): ProductDraft {
  return {
    ...draft,
    imageUrls: [...draft.imageUrls],
    videoUrls: [...draft.videoUrls],
  };
}

function productDraftsEqual(a: ProductDraft, b: ProductDraft): boolean {
  return (
    a.name.trim() === b.name.trim() &&
    a.description.trim() === b.description.trim() &&
    a.categoryId === b.categoryId &&
    a.brandId === b.brandId &&
    a.itemType === b.itemType &&
    a.hsnSac.trim() === b.hsnSac.trim() &&
    a.barcode.trim() === b.barcode.trim() &&
    a.productCode.trim() === b.productCode.trim() &&
    a.unitId === b.unitId &&
    roundMoney2(a.purchasePrice) === roundMoney2(b.purchasePrice) &&
    roundMoney2(a.taxRatePercent) === roundMoney2(b.taxRatePercent) &&
    roundMoney2(a.markupPercent) === roundMoney2(b.markupPercent) &&
    roundMoney2(a.defaultPrice) === roundMoney2(b.defaultPrice) &&
    roundMoney2(a.defaultMrp) === roundMoney2(b.defaultMrp) &&
    a.imagePreviewIndex === b.imagePreviewIndex &&
    a.imageUrls.length === b.imageUrls.length &&
    a.imageUrls.every((url, i) => url === b.imageUrls[i]) &&
    a.videoUrls.length === b.videoUrls.length &&
    a.videoUrls.every((url, i) => url === b.videoUrls[i])
  );
}

function cloneGroupDrafts(groups: GroupDraft[]): GroupDraft[] {
  return groups.map((g) => ({
    ...g,
    rows: g.rows.map((r) => ({ ...r })),
  }));
}

function normalizeGroupDrafts(groups: GroupDraft[]) {
  return groups.map((g) => ({
    localId: g.localId,
    name: g.name.trim(),
    rows: g.rows.map((r) => ({
      variantId: r.variantId ?? null,
      name: r.name.trim(),
      price: roundMoney2(r.price),
      mrp: roundMoney2(r.mrp),
      stock: Math.max(0, Math.floor(r.stock)),
    })),
  }));
}

function groupDraftsEqual(a: GroupDraft[], b: GroupDraft[]): boolean {
  return (
    JSON.stringify(normalizeGroupDrafts(a)) === JSON.stringify(normalizeGroupDrafts(b))
  );
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
    itemType: detail.product.item_type ?? "goods",
    hsnSac: detail.product.hsn_sac ?? null,
  });
  await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
}

const CREATE_STEPS: { id: StepId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "details", label: "Item Details", icon: Package },
  { id: "variants", label: "Inventory", icon: Layers },
  { id: "review", label: "Preview", icon: ClipboardCheck },
];

const EDIT_STEPS: { id: StepId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "details", label: "Item Details", icon: Package },
  { id: "variants", label: "Inventory", icon: Layers },
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
  const { settings } = useCurrencySettings();
  const showMrp = settings.show_mrp;
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
          <div className={`grid gap-2 ${showMrp ? "grid-cols-3" : "grid-cols-2"}`}>
            <CompactField label={currencyLabel("Price")}>
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
            {showMrp ? (
              <CompactField label={currencyLabel("MRP")}>
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
            ) : null}
            <CompactField label="Stock">
              <input
                className={compactInputCls}
                type="number"
                step="1"
                min="0"
                value={draft.stock || ""}
                onChange={(e) =>
                  onChange({ ...draft, stock: parseStockInput(e.target.value) })
                }
                placeholder="0"
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
  const { settings } = useCurrencySettings();
  const showMrp = settings.show_mrp;
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
        <div className={`grid gap-2 ${showMrp ? "grid-cols-3" : "grid-cols-2"}`}>
          <CompactField label={currencyLabel("Price")}>
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
          {showMrp ? (
            <CompactField label={currencyLabel("MRP")}>
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
          ) : null}
          <CompactField label="Stock">
            <input
              className={compactInputCls}
              type="number"
              step="1"
              min="0"
              value={draft.stock || ""}
              onChange={(e) =>
                setDraft({ ...draft, stock: parseStockInput(e.target.value) })
              }
              placeholder="0"
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
            if (!draft.name.trim() || !isPricingValid(draft.price, draft.mrp, showMrp)) return;
            onAdd({ ...draft, localId: newLocalId() });
            setDraft(emptyVariantDraft(""));
          }}
          disabled={!draft.name.trim() || !isPricingValid(draft.price, draft.mrp, showMrp)}
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
  groupDrafts,
  layoutGrouped,
  categories,
  brands,
}: {
  productDraft: ProductDraft;
  variantDrafts: VariantDraft[];
  groupDrafts: GroupDraft[];
  layoutGrouped: boolean;
  categories: Category[];
  brands: Brand[];
}) {
  const categoryName =
    categories.find((c) => c.id === productDraft.categoryId)?.name ??
    "Uncategorized";
  const brandName =
    brands.find((b) => b.id === productDraft.brandId)?.name ?? null;

  const previewUrl = catalogImageFromProductDraft(productDraft);
  const skuCount = layoutGrouped
    ? groupDrafts.reduce((n, g) => n + g.rows.length, 0)
    : variantDrafts.length;
  const priceLabel = layoutGrouped
    ? "Grouped SKUs"
    : formatPriceRange(variantDrafts);

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
            {layoutGrouped
              ? groupDrafts.flatMap((g) =>
                  g.rows.map((r) => (
                    <li key={r.localId} className="flex items-center gap-2.5 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {g.name || "Group"} · {r.name || "Model"}
                        </p>
                        <p className="text-[11px] font-medium tabular-nums text-slate-500">
                          {r.price > 0 ? formatInr(r.price) : "—"}
                          {r.stock > 0 ? ` · ${r.stock} in stock` : " · 0 in stock"}
                        </p>
                      </div>
                    </li>
                  )),
                )
              : variantDrafts.map((v) => (
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
                        {v.stock > 0 ? `${v.stock.toLocaleString("en-IN")} in stock` : "0 in stock"}
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
  hideImages = false,
  onCatalogSync,
  onDeleted,
}: {
  productId: string;
  variant: ProductVariant;
  canDelete: boolean;
  hideImages?: boolean;
  onCatalogSync?: () => Promise<void>;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const { settings } = useCurrencySettings();
  const showMrp = settings.show_mrp;
  const { runAction: runDeleteAction, isPending: deletePending } = useAdminAction();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const images = variant.images ?? [];
  const preview = hideImages ? null : images[0]?.url ?? null;

  function handleDelete() {
    if (!canDelete) return;
    if (!confirm(`Delete variant "${variant.name ?? "variant"}"?`)) return;
    runDeleteAction(async () => {
      await deleteVariantAction(variant.id, productId);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(productId),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      await onCatalogSync?.();
      onDeleted?.();
    }, { errorTitle: "Couldn't delete variant" });
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const price = roundMoney2(parseFloat(fd.get("price") as string));
    const mrp = showMrp
      ? roundMoney2(parseFloat(fd.get("mrp") as string))
      : 0;
    if (!name || !Number.isFinite(price) || price <= 0) {
      return setError("Name and selling price greater than 0 are required.");
    }
    if (showMrp && !Number.isFinite(mrp)) {
      return setError("MRP must be a valid number.");
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
        setError(formatActionError(err));
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
            disabled={isPending || deletePending || !canDelete}
            onClick={handleDelete}
            title={canDelete ? "Remove SKU" : "At least one SKU required"}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-100 bg-rose-50/80 px-2.5 text-[11px] font-bold text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3" />
            Remove
          </button>
        </div>

        <div className="flex gap-3">
          {!hideImages ? (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50">
              <VariantThumb url={preview} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            <CompactField label="Variant name">
              <input
                className={compactInputCls}
                name="name"
                defaultValue={variant.name ?? ""}
                required
              />
            </CompactField>
            <div className={`grid gap-2 ${showMrp ? "grid-cols-2" : "grid-cols-1"}`}>
              <CompactField label={currencyLabel("Price")}>
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
              {showMrp ? (
                <CompactField label={currencyLabel("MRP")}>
                  <input
                    className={compactInputCls}
                    name="mrp"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={moneyInputValue(variant.mrp)}
                  />
                </CompactField>
              ) : null}
            </div>
          </div>
        </div>

        <FormError message={error} />
      </form>

      {!hideImages ? (
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
      ) : null}
    </div>
  );
}

function NewVariantPanel({
  productId,
  hideImages = false,
  defaultPrice = 0,
  defaultMrp = 0,
  onCreated,
  onCatalogSync,
}: {
  productId: string;
  hideImages?: boolean;
  defaultPrice?: number;
  defaultMrp?: number;
  onCreated?: () => void;
  onCatalogSync?: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const { settings } = useCurrencySettings();
  const showMrp = settings.show_mrp;
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
    const mrp = showMrp
      ? roundMoney2(parseFloat(fd.get("mrp") as string))
      : 0;
    const stock = parseStockInput((fd.get("stock") as string) ?? "");
    if (!name || !Number.isFinite(price) || price <= 0) {
      return setError("Name and selling price greater than 0 are required.");
    }
    if (showMrp && !Number.isFinite(mrp)) {
      return setError("MRP must be a valid number.");
    }
    setError(null);
    startTransition(async () => {
      try {
        await createVariantAction(productId, {
          name,
          price,
          mrp,
          stock,
          imageUrls: hideImages ? [] : orderedImages(images, previewIndex),
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
        setError(formatActionError(err));
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
        <div className={`grid gap-2 ${showMrp ? "grid-cols-3" : "grid-cols-2"}`}>
          <CompactField label={currencyLabel("Price")}>
            <input
              className={compactInputCls}
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={defaultPrice > 0 ? defaultPrice : undefined}
              required
            />
          </CompactField>
          {showMrp ? (
            <CompactField label={currencyLabel("MRP")}>
              <input
                className={compactInputCls}
                name="mrp"
                type="number"
                step="0.01"
                min="0"
                defaultValue={defaultMrp > 0 ? defaultMrp : undefined}
              />
            </CompactField>
          ) : null}
          <CompactField label="Stock">
            <input className={compactInputCls} name="stock" type="number" step="1" min="0" placeholder="0" />
          </CompactField>
        </div>
      </div>

      {!hideImages ? (
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
      ) : null}

      <FormError message={error} />
    </form>
  );
}

function resolveInitialVariantSelection(
  variants: ProductVariant[],
  initialSelectedVariantId?: string | null,
): string | null {
  if (initialSelectedVariantId === null) return null;
  if (
    initialSelectedVariantId &&
    variants.some((v) => v.id === initialSelectedVariantId)
  ) {
    return initialSelectedVariantId;
  }
  return variants[0]?.id ?? null;
}

function EditVariantsStep({
  productId,
  variants,
  isLoading,
  isGroupedLayout = false,
  defaultPrice = 0,
  defaultMrp = 0,
  initialSelectedVariantId,
  onCatalogSync,
  onFormIdChange,
}: {
  productId: string;
  variants: ProductVariant[];
  isLoading: boolean;
  isGroupedLayout?: boolean;
  defaultPrice?: number;
  defaultMrp?: number;
  initialSelectedVariantId?: string | null;
  onCatalogSync?: () => Promise<void>;
  onFormIdChange?: (formId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resolveInitialVariantSelection(variants, initialSelectedVariantId),
  );

  useEffect(() => {
    if (initialSelectedVariantId === undefined) return;
    setSelectedId(resolveInitialVariantSelection(variants, initialSelectedVariantId));
  }, [initialSelectedVariantId, variants]);

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
                    thumbUrl={isGroupedLayout ? null : imgs[0]?.url ?? null}
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
            hideImages={isGroupedLayout}
            onCatalogSync={onCatalogSync}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <NewVariantPanel
            productId={productId}
            hideImages={isGroupedLayout}
            defaultPrice={defaultPrice}
            defaultMrp={defaultMrp}
            onCatalogSync={onCatalogSync}
          />
        )
      }
    />
  );
}

function SkuConfigurationStep({
  skuTab,
  onSkuTabChange,
  flatTabDisabled,
  groupsTabDisabled,
  variantDrafts,
  onVariantDraftsChange,
  onFlatDirty,
  groupDrafts,
  onGroupDraftsChange,
  onGroupedDirty,
  showMrp,
  defaultPrice,
  defaultMrp,
}: {
  skuTab: SkuTab;
  onSkuTabChange: (tab: SkuTab) => void;
  flatTabDisabled: boolean;
  groupsTabDisabled: boolean;
  variantDrafts: VariantDraft[];
  onVariantDraftsChange: (next: VariantDraft[]) => void;
  onFlatDirty: () => void;
  groupDrafts: GroupDraft[];
  onGroupDraftsChange: (next: GroupDraft[]) => void;
  onGroupedDirty: () => void;
  showMrp: boolean;
  defaultPrice: number;
  defaultMrp: number;
}) {
  const tabCls = (active: boolean, disabled: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-bold transition ${
      disabled
        ? "cursor-not-allowed opacity-40 text-slate-400"
        : active
          ? "bg-[#2563EB] text-white"
          : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-2.5">
        <button
          type="button"
          disabled={groupsTabDisabled}
          className={tabCls(skuTab === "groups", groupsTabDisabled)}
          onClick={() => !groupsTabDisabled && onSkuTabChange("groups")}
        >
          Variant groups
        </button>
        <button
          type="button"
          disabled={flatTabDisabled}
          className={tabCls(skuTab === "variants", flatTabDisabled)}
          onClick={() => !flatTabDisabled && onSkuTabChange("variants")}
        >
          Variants
        </button>
        {flatTabDisabled || groupsTabDisabled ? (
          <span className="ml-2 text-[10px] font-medium text-slate-400">
            One layout per product — clear the other tab to switch.
          </span>
        ) : null}
      </div>
      {skuTab === "groups" ? (
        <GroupVariantsStep
          groups={groupDrafts}
          onChange={onGroupDraftsChange}
          onDirty={onGroupedDirty}
          showMrp={showMrp}
          defaultPrice={defaultPrice}
          defaultMrp={defaultMrp}
        />
      ) : (
        <CreateVariantsStep
          drafts={variantDrafts}
          onChange={(next) => {
            onFlatDirty();
            onVariantDraftsChange(next);
          }}
        />
      )}
    </div>
  );
}

function variantErpFieldsFromDraft(draft: ProductDraft) {
  return {
    barcode: draft.barcode.trim() || null,
    productCode: draft.productCode.trim() || null,
    purchasePrice: draft.purchasePrice > 0 ? roundMoney2(draft.purchasePrice) : null,
    taxRatePercent: draft.taxRatePercent > 0 ? roundMoney2(draft.taxRatePercent) : null,
    unitId: draft.unitId,
    markupPercent: draft.markupPercent > 0 ? roundMoney2(draft.markupPercent) : null,
  };
}

function DetailsStepForm({
  draft,
  categories,
  brands,
  itemUnits,
  onDraftChange,
  error,
  showMrp,
  isGroupedLayout = false,
}: {
  draft: ProductDraft;
  categories: Category[];
  brands: Brand[];
  itemUnits: ItemUnit[];
  onDraftChange: (next: ProductDraft) => void;
  error: string | null;
  showMrp: boolean;
  isGroupedLayout?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-1">
        <div className="space-y-3">
          <CompactField label="Item type">
            <div className="flex gap-4 pt-1">
              {(["goods", "service"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    name="item-type"
                    checked={draft.itemType === type}
                    onChange={() => onDraftChange({ ...draft, itemType: type })}
                  />
                  {type === "goods" ? "Goods" : "Service"}
                </label>
              ))}
            </div>
          </CompactField>

          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Category">
              <select
                className={compactSelectCls}
                value={draft.categoryId ?? ""}
                onChange={(e) =>
                  onDraftChange({ ...draft, categoryId: e.target.value || null })
                }
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatCategoryOptionLabel(c, categories)}
                  </option>
                ))}
              </select>
            </CompactField>

            <CompactField label="Unit">
              <select
                className={compactSelectCls}
                value={draft.unitId ?? ""}
                onChange={(e) =>
                  onDraftChange({ ...draft, unitId: e.target.value || null })
                }
              >
                <option value="">Type to search OR add new</option>
                {itemUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
              </select>
            </CompactField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Barcode">
              <input
                className={compactInputCls}
                value={draft.barcode}
                onChange={(e) => onDraftChange({ ...draft, barcode: e.target.value })}
                placeholder="Barcode"
              />
            </CompactField>

            <CompactField label="HSN/SAC">
              <input
                className={compactInputCls}
                value={draft.hsnSac}
                onChange={(e) => onDraftChange({ ...draft, hsnSac: e.target.value })}
                placeholder="Enter HSN Code"
              />
            </CompactField>
          </div>

          <CompactField label="Name">
            <input
              className={compactInputCls}
              value={draft.name}
              onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
              placeholder="Name"
              required
            />
          </CompactField>

          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Product code">
              <input
                className={compactInputCls}
                value={draft.productCode}
                onChange={(e) => onDraftChange({ ...draft, productCode: e.target.value })}
                placeholder="Product Code"
              />
            </CompactField>

            <CompactField label="Manufacturer / brand">
              <select
                className={compactSelectCls}
                value={draft.brandId ?? ""}
                onChange={(e) =>
                  onDraftChange({ ...draft, brandId: e.target.value || null })
                }
              >
                <option value="">Select</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name ?? "Unnamed"}
                  </option>
                ))}
              </select>
            </CompactField>
          </div>

          <div className={`grid gap-2 ${showMrp ? "grid-cols-3" : "grid-cols-2"}`}>
            <CompactField label="Purchase price">
              <input
                className={compactInputCls}
                type="number"
                step="0.001"
                min="0"
                value={draft.purchasePrice || ""}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    purchasePrice: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.000"
              />
            </CompactField>
            <CompactField label={currencyLabel("Sales price")}>
              <input
                className={compactInputCls}
                type="number"
                step="0.001"
                min="0.01"
                value={draft.defaultPrice || ""}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    defaultPrice: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.000"
                required
              />
            </CompactField>
            {showMrp ? (
              <CompactField label={currencyLabel("MRP")}>
                <input
                  className={compactInputCls}
                  type="number"
                  step="0.001"
                  min="0"
                  value={draft.defaultMrp || ""}
                  onChange={(e) =>
                    onDraftChange({
                      ...draft,
                      defaultMrp: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Optional"
                />
              </CompactField>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CompactField label="Tax %">
              <input
                className={compactInputCls}
                type="number"
                step="0.01"
                min="0"
                value={draft.taxRatePercent || ""}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    taxRatePercent: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="15"
              />
            </CompactField>
            <CompactField label="Markup margin %">
              <input
                className={compactInputCls}
                type="number"
                step="0.01"
                min="0"
                value={draft.markupPercent || ""}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    markupPercent: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </CompactField>
          </div>

          <p className="text-[10px] text-slate-400">
            {isGroupedLayout
              ? "Default pricing fills new models on the inventory step."
              : "Sales price and ERP identifiers apply to the primary SKU. Add variant-specific stock on the inventory step."}
          </p>

          <CompactField label="Description">
            <textarea
              className={compactTextareaCls}
              value={draft.description}
              onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
              rows={4}
              placeholder="Description"
            />
          </CompactField>

          {error ? (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 w-[min(440px,46%)] shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-bold text-slate-900">Images</p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Product gallery and videos for catalog display.
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <ProductMediaField
            images={draft.imageUrls}
            previewIndex={draft.imagePreviewIndex}
            onImagesChange={(images, previewIndex) =>
              onDraftChange({ ...draft, imageUrls: images, imagePreviewIndex: previewIndex })
            }
            videos={draft.videoUrls}
            onVideosChange={(videoUrls) => onDraftChange({ ...draft, videoUrls })}
          />
        </div>
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
  initialStepId = "details",
  initialVariantId,
}: {
  mode: "create" | "edit";
  product?: ProductWithCategory;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  initialStepId?: StepId;
  /** Flat: null opens new SKU panel; string selects that variant. Grouped: string focuses group row. */
  initialVariantId?: string | null;
}) {
  const queryClient = useQueryClient();
  const { settings } = useCurrencySettings();
  const showMrp = settings.show_mrp;
  const [isPending, startTransition] = useTransition();
  const isCreate = mode === "create";

  const steps = isCreate ? CREATE_STEPS : EDIT_STEPS;
  const resolvedInitialIndex = isCreate
    ? 0
    : Math.max(0, steps.findIndex((s) => s.id === initialStepId));
  const [stepIndex, setStepIndex] = useState(resolvedInitialIndex);
  const [maxReachableIndex, setMaxReachableIndex] = useState(
    isCreate ? 0 : Math.max(resolvedInitialIndex, EDIT_STEPS.length - 1),
  );
  const [error, setError] = useState<string | null>(null);

  const [productDraft, setProductDraft] = useState<ProductDraft>(() =>
    emptyProductDraft(product),
  );
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [groupDrafts, setGroupDrafts] = useState<GroupDraft[]>([]);
  const [skuTab, setSkuTab] = useState<SkuTab>("groups");
  const [flatDirty, setFlatDirty] = useState(false);
  const [groupedDirty, setGroupedDirty] = useState(false);
  const [editFormId, setEditFormId] = useState(EDIT_VARIANT_FORM_ID);
  const [originalVariantIds, setOriginalVariantIds] = useState<string[]>([]);
  const [originalGroupIds, setOriginalGroupIds] = useState<string[]>([]);
  const [detailHydrated, setDetailHydrated] = useState(false);
  const [initialProductDraft, setInitialProductDraft] = useState<ProductDraft | null>(null);
  const [initialGroupDrafts, setInitialGroupDrafts] = useState<GroupDraft[]>([]);

  const productId = product?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: adminQueryKeys.productDetail(productId ?? ""),
    queryFn: () => adminGetNullable<ProductDetailPayload>(`products/${productId}`),
    enabled: !isCreate && Boolean(productId),
  });

  const { data: itemUnitsData } = useQuery({
    queryKey: adminQueryKeys.itemUnits(),
    queryFn: () => adminGet<{ data: ItemUnit[] }>("item-units"),
  });
  const itemUnits = Array.isArray(itemUnitsData)
    ? itemUnitsData
    : (itemUnitsData?.data ?? []);

  const variants = data?.variants ?? [];
  const currentStep = steps[stepIndex]?.id ?? "details";
  const isGroupedProduct =
    !isCreate &&
    (data?.product?.variant_layout === "grouped" ||
      product?.variant_layout === "grouped" ||
      (data?.variant_groups?.length ?? 0) > 0);

  useEffect(() => {
    setDetailHydrated(false);
    const startIndex = isCreate
      ? 0
      : Math.max(0, EDIT_STEPS.findIndex((s) => s.id === initialStepId));
    setStepIndex(startIndex);
    setMaxReachableIndex(isCreate ? 0 : Math.max(startIndex, EDIT_STEPS.length - 1));
    setGroupDrafts([]);
    setVariantDrafts([]);
    setOriginalVariantIds([]);
    setOriginalGroupIds([]);
    setInitialProductDraft(null);
    setInitialGroupDrafts([]);
  }, [productId, isCreate, initialStepId]);

  useEffect(() => {
    if (isCreate || !data || detailHydrated) return;

    const layoutGrouped =
      data.product.variant_layout === "grouped" ||
      (data.variant_groups?.length ?? 0) > 0;

    const draft = productDraftFromDetail(
      data.product,
      data.product_images ?? [],
      data.product_videos ?? [],
      data.variants,
    );
    setProductDraft(draft);
    setInitialProductDraft(cloneProductDraft(draft));
    setOriginalVariantIds(data.variants.map((v) => v.id));

    if (layoutGrouped) {
      const groups = groupDraftsFromApi(data.variant_groups ?? [], data.variants);
      const nextGroups = groups.length > 0 ? groups : [emptyGroupDraft()];
      setGroupDrafts(nextGroups);
      setInitialGroupDrafts(cloneGroupDrafts(nextGroups));
      setOriginalGroupIds((data.variant_groups ?? []).map((g) => g.id));
      setSkuTab("groups");
    } else if (data.variants.length > 0) {
      setVariantDrafts(variantDraftsFromApi(data.variants));
      setSkuTab("variants");
    }

    setDetailHydrated(true);
  }, [isCreate, data, detailHydrated]);

  const detailsValid =
    productDraft.name.trim().length > 0 &&
    (productDraft.defaultPrice > 0 || (!isCreate && variants.length > 0));

  const variantsValid = useMemo(
    () =>
      variantDrafts.length >= 1 &&
      variantDrafts.every(
        (v) => v.name.trim().length > 0 && isPricingValid(v.price, v.mrp, showMrp),
      ),
    [variantDrafts, showMrp],
  );

  const groupsValid = useMemo(
    () => isGroupDraftsValid(groupDrafts, showMrp),
    [groupDrafts, showMrp],
  );

  const layoutGrouped = groupedDirty || (skuTab === "groups" && !flatDirty);

  const skuValid = layoutGrouped ? groupsValid : variantsValid;

  const isDetailsDirty = useMemo(() => {
    if (isCreate || !initialProductDraft) return true;
    return !productDraftsEqual(productDraft, initialProductDraft);
  }, [isCreate, initialProductDraft, productDraft]);

  const isGroupedVariantsDirty = useMemo(() => {
    if (!isGroupedProduct) return false;
    return !groupDraftsEqual(groupDrafts, initialGroupDrafts);
  }, [isGroupedProduct, groupDrafts, initialGroupDrafts]);

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
        setError(
          isCreate
            ? "Product name and default price are required."
            : "Product name is required.",
        );
        return;
      }
      if (isCreate) {
        const skuDefaults = {
          price: productDraft.defaultPrice,
          mrp: productDraft.defaultMrp,
        };
        if (groupDrafts.length === 0) {
          setGroupDrafts([emptyGroupDraft(skuDefaults)]);
        } else {
          setGroupDrafts(applyGroupDefaults(groupDrafts, productDraft));
        }
        if (variantDrafts.length === 0) {
          setVariantDrafts([emptyVariantDraft()]);
        } else {
          setVariantDrafts(applyVariantDefaults(variantDrafts, productDraft));
        }
        goToStep(1);
        return;
      }
      if (!isDetailsDirty) {
        goToStep(1);
        return;
      }
      startTransition(async () => {
        try {
          const orderedProductImages = orderedImages(
            productDraft.imageUrls,
            productDraft.imagePreviewIndex,
          );
          await updateProductAction(productId!, {
            name: productDraft.name.trim(),
            description: productDraft.description.trim(),
            categoryId: productDraft.categoryId,
            brandId: productDraft.brandId,
            imageUrl:
              catalogImageFromProductDraft(productDraft) ??
              catalogImageFromVariantRows(variants),
            imageUrls: orderedProductImages,
            videoUrls: productDraft.videoUrls,
            imagePreviewIndex: productDraft.imagePreviewIndex,
            itemType: productDraft.itemType,
            hsnSac: productDraft.hsnSac.trim() || null,
          });
          const primaryVariant = variants[0];
          if (primaryVariant) {
            await updateVariantAction(primaryVariant.id, productId!, {
              name: primaryVariant.name ?? productDraft.name.trim(),
              price: productDraft.defaultPrice > 0 ? productDraft.defaultPrice : Number(primaryVariant.price) || 0,
              mrp: productDraft.defaultMrp > 0 ? productDraft.defaultMrp : Number(primaryVariant.mrp) || 0,
              ...variantErpFieldsFromDraft(productDraft),
            });
          }
          await queryClient.invalidateQueries({
            queryKey: adminQueryKeys.productDetail(productId!),
          });
          await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
          goToStep(1);
        } catch (err) {
          setError(formatActionError(err));
        }
      });
      return;
    }
    if (currentStep === "variants") {
      if (isCreate) {
        if (!skuValid) {
          setError(
            layoutGrouped
              ? "Each group needs a name and models with price > 0."
              : "Each SKU needs a name and a selling price greater than 0.",
          );
          return;
        }
        goToStep(2);
      }
    }
  }

  function handleSaveGroupedVariants() {
    if (!productId) return;
    if (!groupsValid) {
      setError("Each group needs a name and models with price > 0.");
      return;
    }
    if (!isGroupedVariantsDirty) {
      onClose();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const groupsPayload = groupDrafts.map((g) => ({
          localId: g.localId,
          name: g.name,
          rows: g.rows.map((r) => ({
            localId: r.localId,
            variantId: r.variantId,
            name: r.name,
            price: r.price,
            mrp: r.mrp,
            stock: r.stock,
          })),
        }));
        await saveGroupedVariantsAction(
          productId,
          groupsPayload,
          originalVariantIds,
          originalGroupIds,
        );
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(productId),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(formatActionError(err));
      }
    });
  }

  function handleCreateAll() {
    if (!detailsValid) {
      setError("Product name is required.");
      goToStep(0);
      return;
    }
    if (!skuValid) {
      setError(
        layoutGrouped
          ? "Each group needs a name and models with price > 0."
          : "Each SKU needs a name and a selling price greater than 0.",
      );
      goToStep(1);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const orderedProductImages = orderedImages(
          productDraft.imageUrls,
          productDraft.imagePreviewIndex,
        );
        const catalogImage = catalogImageFromProductDraft(productDraft);
        const erpFields = variantErpFieldsFromDraft(productDraft);
        const id = await createProductAction({
          name: productDraft.name.trim(),
          description: productDraft.description.trim(),
          categoryId: productDraft.categoryId,
          brandId: productDraft.brandId,
          imageUrl: catalogImage,
          variantLayout: layoutGrouped ? "grouped" : "flat",
          imageUrls: orderedProductImages,
          videoUrls: productDraft.videoUrls,
          itemType: productDraft.itemType,
          hsnSac: productDraft.hsnSac.trim() || null,
        });

        if (layoutGrouped) {
          for (let gi = 0; gi < groupDrafts.length; gi++) {
            const g = groupDrafts[gi];
            const groupId = await createVariantGroupAction(id, {
              name: g.name.trim(),
              sortOrder: gi,
            });
            for (let ri = 0; ri < g.rows.length; ri++) {
              const row = g.rows[ri];
              await createVariantAction(id, {
                name: row.name.trim(),
                price: roundMoney2(row.price),
                mrp: roundMoney2(row.mrp),
                stock: row.stock,
                variantGroupId: groupId,
                ...(gi === 0 && ri === 0 ? erpFields : {}),
              });
            }
          }
        } else {
          for (let i = 0; i < variantDrafts.length; i++) {
            const v = variantDrafts[i];
            await createVariantAction(id, {
              name: v.name.trim() || DEFAULT_SKU_NAME,
              price: roundMoney2(v.price),
              mrp: roundMoney2(v.mrp),
              stock: v.stock,
              imageUrls: orderedImages(v.imageUrls, v.previewIndex),
              ...(i === 0 ? erpFields : {}),
            });
          }
        }
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(formatActionError(err));
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
      title={isCreate ? "Inventory Item" : "Inventory Item"}
      subtitle={
        isCreate
          ? "Item Details → Inventory → Preview"
          : (product?.name ?? "Update item details and inventory")
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
            {currentStep === "details" && !isCreate && isLoading && !detailHydrated ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-slate-400">
                <Loader2
                  className="size-6 animate-spin text-[color:var(--brand)]"
                  style={{ ["--brand" as string]: BRAND }}
                />
                <p className="text-xs font-medium">Loading product…</p>
              </div>
            ) : null}

            {currentStep === "details" && (isCreate || detailHydrated || !isLoading) ? (
              <DetailsStepForm
                draft={productDraft}
                categories={categories}
                brands={brands}
                itemUnits={itemUnits}
                onDraftChange={setProductDraft}
                error={error}
                showMrp={showMrp}
                isGroupedLayout={isCreate ? layoutGrouped : isGroupedProduct}
              />
            ) : null}

            {currentStep === "variants" && isCreate ? (
              <SkuConfigurationStep
                skuTab={skuTab}
                onSkuTabChange={setSkuTab}
                flatTabDisabled={groupedDirty}
                groupsTabDisabled={flatDirty}
                variantDrafts={variantDrafts}
                onVariantDraftsChange={setVariantDrafts}
                onFlatDirty={() => setFlatDirty(true)}
                groupDrafts={groupDrafts}
                onGroupDraftsChange={setGroupDrafts}
                onGroupedDirty={() => setGroupedDirty(true)}
                showMrp={showMrp}
                defaultPrice={productDraft.defaultPrice}
                defaultMrp={productDraft.defaultMrp}
              />
            ) : null}

            {currentStep === "variants" && !isCreate && productId && isGroupedProduct ? (
              <GroupVariantsStep
                groups={groupDrafts}
                onChange={setGroupDrafts}
                onDirty={() => setGroupedDirty(true)}
                showMrp={showMrp}
                defaultPrice={productDraft.defaultPrice}
                defaultMrp={productDraft.defaultMrp}
                initialVariantId={
                  typeof initialVariantId === "string" ? initialVariantId : undefined
                }
              />
            ) : null}

            {currentStep === "variants" && !isCreate && productId && !isGroupedProduct ? (
              <EditVariantsStep
                productId={productId}
                variants={variants}
                isLoading={isLoading && !data}
                isGroupedLayout={false}
                defaultPrice={productDraft.defaultPrice}
                defaultMrp={productDraft.defaultMrp}
                initialSelectedVariantId={initialVariantId}
                onCatalogSync={handleCatalogSync}
                onFormIdChange={setEditFormId}
              />
            ) : null}

            {currentStep === "review" && isCreate ? (
              <ReviewStep
                productDraft={productDraft}
                variantDrafts={variantDrafts}
                groupDrafts={groupDrafts}
                layoutGrouped={layoutGrouped}
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
                (currentStep === "variants" && isCreate && !skuValid)
              }
            >
              {isPending ? "Saving…" : "Continue"}
            </PrimaryBtn>
          ) : isGroupedProduct ? (
            <PrimaryBtn
              onClick={handleSaveGroupedVariants}
              disabled={isPending || !groupsValid}
            >
              {isPending
                ? "Saving…"
                : isGroupedVariantsDirty
                  ? "Save changes"
                  : "Done"}
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
