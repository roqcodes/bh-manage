"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

import type {
  Category,
  ProductAtGlanceMetrics,
  ProductVariant,
  ProductWithCategory,
} from "@/common/admin/types";
import type { PricingRuleRow } from "@/modules/pricing/types";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { ProductDetailPanel } from "@/modules/products/components/product-detail-panel";
import { adminGetNullable } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

type ProductDetailPayload = {
  product: ProductWithCategory;
  variants: ProductVariant[];
  categories: Category[];
  pricingRule: PricingRuleRow | null;
  glance: ProductAtGlanceMetrics;
};

export function AdminProductDetailView() {
  const params = useParams();
  const slug = (params.slug as string[] | undefined) ?? [];
  const id =
    slug[0] === "products" && typeof slug[1] === "string" ? slug[1] : "";

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.productDetail(id),
    queryFn: () => adminGetNullable<ProductDetailPayload>(`products/${id}`),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  if (!id) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-slate-600">Missing product id.</p>
      </div>
    );
  }

  if (isPending && data === undefined) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5">
          <AlertTriangle className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-bold text-rose-900">
              Failed to load product.
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-rose-700">
              {error instanceof Error ? error.message : "Unknown error."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All products
        </Link>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
          <p className="text-sm font-semibold text-slate-500">
            This product could not be found.
          </p>
        </div>
      </div>
    );
  }

  const { product, variants, categories, pricingRule, glance } = data;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All products
      </Link>

      <ProductDetailPanel
        product={product}
        variants={variants}
        categories={categories}
        pricingRule={pricingRule}
        glance={glance}
      />
    </div>
  );
}
