"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import type { Category, ProductWithCategory } from "@/common/admin/types";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { ProductsPanel } from "@/modules/products/components/products-panel";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

interface ProductCatalogStatsPayload {
  total: number;
  active: number;
  inactive: number;
  categoriesCount: number;
  uncategorized: number;
  categoryCounts: Record<string, number>;
}

interface ProductsPayload {
  data: ProductWithCategory[];
  total: number;
  categories: Category[];
  page: number;
  stats: ProductCatalogStatsPayload;
}

export function AdminProductsView() {
  const searchParams = useSearchParams();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const categoryId = searchParams.get("category_id") || null;

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.products(page, categoryId),
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", page.toString());
      if (categoryId) q.set("category_id", categoryId);
      return adminGet<ProductsPayload>(`products?${q.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  if (isPending && !data) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-4">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5">
          <div>
            <p className="text-sm font-bold text-rose-900">
              Failed to load products.
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

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-3 sm:px-4 sm:py-4">
      <ProductsPanel
        products={data.data}
        categories={data.categories}
        total={data.total}
        page={data.page}
        stats={data.stats}
      />
    </div>
  );
}
