"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  Plus,
  Pencil,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Package,
  CheckCircle2,
  Tag,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import type { Category, ProductWithCategory } from "@/common/admin/types";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
  toggleProductAction,
} from "@/modules/products/actions/products.actions";
import { Pagination } from "@/modules/admin/components/pagination";
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
import { ProductImageField } from "@/modules/products/components/product-image-field";

const BRAND = "#2563EB";
const ALL_CATEGORIES = "__all__";
const UNCATEGORIZED = "__uncategorized__";

interface ProductCatalogStatsPayload {
  total: number;
  active: number;
  inactive: number;
  categoriesCount: number;
  uncategorized: number;
  categoryCounts: Record<string, number>;
}

/* ────────────────────────── atomic UI (dashboard-consistent) ────────────────────────── */

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

/* ────────────────────────── product form (modal) ────────────────────────── */

function ProductFormImage({ url }: { url: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url?.trim() ?? "";
  useEffect(() => {
    setFailed(false);
  }, [trimmed]);
  if (!trimmed || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-slate-300">
        <Package strokeWidth={1.5} className="size-10" />
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

function ProductForm({
  product,
  categories,
  onClose,
}: {
  product?: ProductWithCategory;
  categories: Category[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(product?.image_url?.trim() ?? "");
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    setImageUrl(product?.image_url?.trim() ?? "");
  }, [product?.id]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const description = (fd.get("description") as string).trim();
    const categoryId = (fd.get("categoryId") as string) || null;
    const imageUrlValue = imageUrl.trim() || null;
    if (!name) return setError("Product name is required.");
    setError(null);
    startTransition(async () => {
      try {
        if (product) {
          await updateProductAction(product.id, {
            name,
            description,
            categoryId,
            imageUrl: imageUrlValue,
          });
        } else {
          await createProductAction({
            name,
            description,
            categoryId,
            imageUrl: imageUrlValue,
          });
        }
        void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldLabel label="Product Name">
        <input
          className={inputCls}
          name="name"
          defaultValue={product?.name ?? ""}
          placeholder="e.g. Wireless Mouse"
          required
        />
      </FieldLabel>
      <ProductImageField
        value={imageUrl}
        onChange={setImageUrl}
        onUploadingChange={setImageUploading}
      />
      <FieldLabel label="Description">
        <textarea
          className={textareaCls}
          name="description"
          defaultValue={product?.description ?? ""}
          rows={3}
          placeholder="Optional description…"
        />
      </FieldLabel>
      <FieldLabel label="Category">
        <select
          name="categoryId"
          className={selectCls}
          defaultValue={product?.category_id ?? ""}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FieldLabel>

      <FormError message={error} />
      <div className="flex justify-end gap-2 pt-1">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending || imageUploading}>
          {imageUploading
            ? "Uploading…"
            : isPending
              ? "Saving…"
              : product
                ? "Save Changes"
                : "Create Product"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

/* ────────────────────────── categories strip ────────────────────────── */

const CATEGORY_TINTS = [
  "linear-gradient(135deg, #fce8ec, #e9b8c4)",
  "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
  "linear-gradient(135deg, #d1fae5, #a7f3d0)",
  "linear-gradient(135deg, #fef9c3, #fde68a)",
  "linear-gradient(135deg, #ede9fe, #ddd6fe)",
  "linear-gradient(135deg, #ffe4e6, #fecdd3)",
  "linear-gradient(135deg, #cffafe, #a5f3fc)",
  "linear-gradient(135deg, #fed7aa, #fdba74)",
];

function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CATEGORY_TINTS[h % CATEGORY_TINTS.length];
}

function CategoryPill({
  label,
  count,
  active,
  onClick,
  tint,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative shrink-0 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
        active
          ? "border-[color:var(--brand)]/35 bg-white shadow-[0_8px_24px_-10px_rgba(37,99,235,0.25)] ring-2 ring-[color:var(--brand)]/20"
          : "border-slate-200/70 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      }`}
      style={{ ["--brand" as string]: BRAND }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-[0.09] blur-2xl transition-opacity group-hover:opacity-[0.16]"
        style={{ background: tint }}
        aria-hidden
      />
      <div className="relative flex items-center gap-2.5">
        <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200/55 bg-white/90 shadow-sm shadow-slate-900/[0.04]">
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{ background: tint }}
            aria-hidden
          />
          <Tag className="relative size-3.5 text-slate-600" aria-hidden />
        </span>
        <div className="min-w-0">
          <p
            className={`truncate text-[12.5px] font-bold leading-tight tracking-tight ${
              active ? "text-slate-950" : "text-slate-900"
            }`}
          >
            {label}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 tabular-nums">
            {count.toLocaleString("en-IN")} items
          </p>
        </div>
      </div>
    </button>
  );
}

function CategoriesStrip({
  categories,
  stats,
  active,
  onSelect,
}: {
  categories: Category[];
  stats: ProductCatalogStatsPayload;
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section aria-label="Categories">
      <SectionEyebrow
        icon={Layers}
        trailing={
          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {stats.categoriesCount.toLocaleString("en-IN")} categories
          </span>
        }
      >
        Browse by category
      </SectionEyebrow>

      <div
        className="relative -mx-1 overflow-x-auto px-1 pb-1"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="flex items-stretch gap-2.5">
          <CategoryPill
            label="All products"
            count={stats.total}
            active={active === ALL_CATEGORIES}
            onClick={() => onSelect(ALL_CATEGORIES)}
            tint="linear-gradient(135deg, #fce8ec, #e9b8c4)"
          />
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              label={c.name ?? "Unnamed"}
              count={stats.categoryCounts[c.id] ?? 0}
              active={active === c.id}
              onClick={() => onSelect(c.id)}
              tint={tintFor(c.id)}
            />
          ))}
          {stats.uncategorized > 0 ? (
            <CategoryPill
              label="Uncategorized"
              count={stats.uncategorized}
              active={active === UNCATEGORIZED}
              onClick={() => onSelect(UNCATEGORIZED)}
              tint="linear-gradient(135deg, #e2e8f0, #cbd5e1)"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── product card ────────────────────────── */

function ProductCard({
  product,
  isPending,
  onEdit,
  onToggle,
  onDelete,
}: {
  product: ProductWithCategory;
  isPending: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const tint = product.category_id
    ? tintFor(product.category_id)
    : "linear-gradient(135deg, #e2e8f0, #cbd5e1)";
  const isActive = product.is_active ?? false;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_2px_10px_-4px_rgba(15,23,42,0.06),0_20px_40px_-24px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.1),0_28px_50px_-24px_rgba(15,23,42,0.16)]">
      {/* Image — fixed crop box; photos fill with object-cover */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-slate-50 sm:h-48">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{ background: tint }}
          aria-hidden
        />
        <div className="absolute inset-0">
          <ProductFormImage url={product.image_url} />
        </div>

        {/* top badges */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-end gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur ring-1 ${
              isActive
                ? "bg-emerald-50/90 text-emerald-700 ring-emerald-500/20"
                : "bg-slate-100/90 text-slate-500 ring-slate-900/10"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                isActive ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5">
          <Tag className="size-3 text-slate-300" aria-hidden />
          <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {product.categories?.name ?? "Uncategorized"}
          </p>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-black leading-snug tracking-tight text-slate-950">
          {product.name ?? "Untitled product"}
        </h3>
        {product.description ? (
          <p className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-snug text-slate-500">
            {product.description}
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] font-medium italic leading-snug text-slate-300">
            No description provided.
          </p>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          {product.created_at ? (
            <span>
              Added {format(new Date(product.created_at), "MMM d, yyyy")}
            </span>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/products/${product.id}`}
              className="group/primary flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.5)] transition hover:shadow-[0_10px_22px_-6px_rgba(37,99,235,0.55)]"
              style={{
                background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
              }}
            >
              variants
              <ArrowRight className="size-3.5 transition-transform group-hover/primary:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={onEdit}
              title="Edit product"
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onToggle}
              title={isActive ? "Deactivate" : "Activate"}
              className={`flex size-9 items-center justify-center rounded-xl border transition disabled:opacity-50 ${
                isActive
                  ? "border-emerald-200/80 bg-emerald-50/70 text-emerald-600 hover:bg-emerald-50"
                  : "border-slate-200/70 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {isActive ? (
                <ToggleRight className="size-4" />
              ) : (
                <ToggleLeft className="size-4" />
              )}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onDelete}
              title="Delete product"
              className="flex size-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50/80 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── products panel ────────────────────────── */

export function ProductsPanel({
  products,
  categories,
  total,
  page,
  stats,
}: {
  products: ProductWithCategory[];
  categories: Category[];
  total: number;
  page: number;
  stats: ProductCatalogStatsPayload;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modal, setModal] = useState<"create" | ProductWithCategory | null>(
    null,
  );
  const activeCategory = searchParams.get("category_id") || ALL_CATEGORIES;
  const [search, setSearch] = useState("");

  function handleCategorySelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "0");
    if (id === ALL_CATEGORIES) {
      params.delete("category_id");
    } else {
      params.set("category_id", id);
    }
    router.push(`?${params.toString()}`);
  }

  function handleToggle(product: ProductWithCategory) {
    startTransition(async () => {
      await toggleProductAction(product.id, !product.is_active);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  function handleDelete(product: ProductWithCategory) {
    if (!confirm(`Delete product "${product.name ?? "product"}"?`)) return;
    startTransition(async () => {
      try {
        await deleteProductAction(product.id);
        void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not delete product.");
      }
    });
  }

  const activePct =
    stats.total > 0 ? (stats.active / stats.total) * 100 : 0;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q.length > 0) {
        const name = (p.name ?? "").toLowerCase();
        const desc = (p.description ?? "").toLowerCase();
        const cat = (p.categories?.name ?? "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !cat.includes(q))
          return false;
      }
      return true;
    });
  }, [products, search]);

  const isFiltering = search.trim().length > 0;

  return (
    <>
    <AnimatePresence>
      {modal && (
        <Modal
          title={modal === "create" ? "New Product" : "Edit Product"}
          onClose={() => setModal(null)}
          size="md"
        >
          <ProductForm
            key={modal === "create" ? "create" : modal.id}
            product={modal === "create" ? undefined : modal}
            categories={categories}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </AnimatePresence>

    <div className="space-y-6 lg:space-y-7">
        {/* Hero */}
        <header className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Products
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
              Manage your catalog — add products, organize them by category,
              and keep your offering sharp.
            </p>
          </div>
          <button
            onClick={() => setModal("create")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_22px_-8px_rgba(37,99,235,0.55)] transition hover:shadow-[0_14px_28px_-8px_rgba(37,99,235,0.6)]"
            style={{
              background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
            }}
          >
            <Plus className="size-4" />
            New Product
          </button>
        </header>

        {/* Stat cards */}
        <section aria-label="Catalog stats">
          <SectionEyebrow
            icon={Sparkles}
            trailing={
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Catalog · live
              </span>
            }
          >
            Catalog pulse
          </SectionEyebrow>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Total products"
              value={stats.total.toLocaleString("en-IN")}
              icon={Package}
              tint="linear-gradient(135deg, #fce8ec, #e9b8c4)"
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  <TrendChip tone="neutral">
                    {stats.categoriesCount.toLocaleString("en-IN")} categories
                  </TrendChip>
                  {stats.uncategorized > 0 ? (
                    <TrendChip tone="neutral">
                      {stats.uncategorized.toLocaleString("en-IN")} uncategorized
                    </TrendChip>
                  ) : null}
                </div>
              }
            />

            <KpiCard
              label="Active"
              value={stats.active.toLocaleString("en-IN")}
              icon={CheckCircle2}
              tint="linear-gradient(135deg, #d1fae5, #a7f3d0)"
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  <TrendChip tone={activePct >= 70 ? "up" : "neutral"}>
                    {Math.round(activePct)}% live
                  </TrendChip>
                  {stats.inactive > 0 ? (
                    <TrendChip tone="neutral">
                      {stats.inactive.toLocaleString("en-IN")} inactive
                    </TrendChip>
                  ) : null}
                </div>
              }
            >
              <InlineRail
                pct={activePct}
                label="Active share"
                value={`${stats.active} / ${stats.total}`}
                gradient="linear-gradient(90deg, #86efac, #4ade80)"
              />
            </KpiCard>

            <KpiCard
              label="Categories"
              value={stats.categoriesCount.toLocaleString("en-IN")}
              icon={Layers}
              tint="linear-gradient(135deg, #e0e7ff, #c7d2fe)"
              delta={
                <div className="flex flex-wrap items-center gap-2">
                  <TrendChip tone="neutral">
                    Avg{" "}
                    {stats.categoriesCount > 0
                      ? Math.round(
                          (stats.total - stats.uncategorized) /
                            stats.categoriesCount,
                        )
                      : 0}{" "}
                    per category
                  </TrendChip>
                  {stats.uncategorized > 0 ? (
                    <TrendChip tone="down">
                      {stats.uncategorized.toLocaleString("en-IN")} unassigned
                    </TrendChip>
                  ) : null}
                </div>
              }
            >
              <InlineRail
                pct={
                  stats.total > 0
                    ? ((stats.total - stats.uncategorized) / stats.total) * 100
                    : 0
                }
                label="Categorized"
                value={`${stats.total - stats.uncategorized} / ${stats.total}`}
                gradient="linear-gradient(90deg, #c7d2fe, #818cf8)"
              />
            </KpiCard>
          </div>
        </section>

        {/* Categories strip */}
        <CategoriesStrip
          categories={categories}
          stats={stats}
          active={activeCategory}
          onSelect={handleCategorySelect}
        />

        {/* Products grid */}
        <section aria-label="Products">
          <SectionEyebrow
            icon={Package}
            trailing={
              <div className="flex items-center gap-2">
                <label className="relative flex items-center">
                  <Search
                    className="pointer-events-none absolute left-3 size-3.5 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products…"
                    className="h-9 w-44 rounded-xl border border-slate-200/70 bg-white pl-8 pr-3 text-[12.5px] font-semibold text-slate-700 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[color:var(--brand)]/40 focus:ring-2 focus:ring-[color:var(--brand)]/20 sm:w-56"
                    style={{ ["--brand" as string]: BRAND }}
                  />
                </label>
              </div>
            }
          >
            {isFiltering
              ? `${filteredProducts.length} of ${products.length} on this page`
              : `Catalog · page ${page + 1}`}
          </SectionEyebrow>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-6 py-20 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
              <LayoutGrid className="size-12 text-slate-200" />
              <p className="text-sm font-semibold text-slate-400">
                {isFiltering
                  ? "No products match the current filter."
                  : "No products yet."}
              </p>
              {isFiltering ? (
                <button
                  type="button"
                  onClick={() => {
                    handleCategorySelect(ALL_CATEGORIES);
                    setSearch("");
                  }}
                  className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModal("create")}
                  className="mt-1 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.5)] transition hover:shadow-[0_12px_24px_-8px_rgba(37,99,235,0.6)]"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND}, #b5102f)`,
                  }}
                >
                  <Plus className="size-4" />
                  Add your first product
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isPending={isPending}
                  onEdit={() => setModal(product)}
                  onToggle={() => handleToggle(product)}
                  onDelete={() => handleDelete(product)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isFiltering && total > products.length ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
              <Pagination
                total={total}
                page={page}
                basePath="/admin/products"
                listParams={
                  activeCategory !== ALL_CATEGORIES
                    ? { category_id: activeCategory }
                    : undefined
                }
              />
            </div>
          ) : null}
        </section>

      </div>
    </>
  );
}
