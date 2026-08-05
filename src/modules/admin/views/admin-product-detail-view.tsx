"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";
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

function ProductDetailNav({ productName }: { productName?: string | null }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
      <Link
        href="/admin/products"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        aria-label="Back to marketplace"
      >
        <ArrowLeft className="size-4" aria-hidden />
      </Link>
      <ol className="flex min-w-0 items-center gap-1 text-[13px] font-medium text-slate-500">
        <li className="shrink-0">
          <Link
            href="/admin/products"
            className="font-semibold text-slate-600 transition hover:text-[#2563EB]"
          >
            Marketplace
          </Link>
        </li>
        <li className="shrink-0" aria-hidden>
          <ChevronRight className="size-3.5 text-slate-300" />
        </li>
        <li className="min-w-0 truncate font-bold text-slate-900">
          {productName?.trim() || "Product"}
        </li>
      </ol>
    </nav>
  );
}

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
        <ProductDetailNav />
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
      <ProductDetailNav productName={product.name} />

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
