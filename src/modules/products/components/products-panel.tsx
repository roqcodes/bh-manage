"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Ban, ChevronDown, Columns3, Search } from "lucide-react";

import type {
  Brand,
  Category,
  ProductCatalogStats,
  ProductWithCategoryListItem,
} from "@/common/admin/types";
import { formatCategoryOptionLabel } from "@/modules/products/lib/categories.utils";
import { Pagination } from "@/modules/admin/components/pagination";
import { ProductManageModal } from "@/modules/products/components/product-manage-modal";
import {
  exportProductsCsv,
  ProductsBulkActionBar,
  ProductsDataTable,
} from "@/modules/products/components/products-data-table";
import { ProductsMetricsBar } from "@/modules/products/components/products-metrics-bar";
import {
  ALL_CATEGORIES,
  matchesProductStatusFilter,
  PRODUCT_STATUS_FILTERS,
  UNCATEGORIZED,
  type ProductStatusFilter,
} from "@/modules/products/components/products-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

type ManageModalState =
  | { mode: "create" }
  | { mode: "edit"; product: ProductWithCategoryListItem }
  | null;

export function ProductsPanel({
  products,
  categories,
  brands,
  total,
  page,
  stats,
}: {
  products: ProductWithCategoryListItem[];
  categories: Category[];
  brands: Brand[];
  total: number;
  page: number;
  stats: ProductCatalogStats;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modal, setModal] = useState<ManageModalState>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeCategoryId = searchParams.get("category_id") || ALL_CATEGORIES;

  function handleCategoryChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "0");
    if (id === ALL_CATEGORIES) params.delete("category_id");
    else params.set("category_id", id);
    router.push(`?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      if (!matchesProductStatusFilter(p, statusFilter)) return false;
      if (!q) return true;

      const name = (p.name ?? "").toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      const cat = (p.categories?.name ?? "").toLowerCase();
      const sku = (p.sku_label ?? "").toLowerCase();
      const idShort = p.id.slice(0, 8).toLowerCase();
      return (
        name.includes(q) ||
        desc.includes(q) ||
        cat.includes(q) ||
        sku.includes(q) ||
        idShort.includes(q)
      );
    });
  }, [products, search, statusFilter]);

  const isFiltering =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    activeCategoryId !== ALL_CATEGORIES;

  const listParams: Record<string, string> = {};
  if (activeCategoryId !== ALL_CATEGORIES) {
    listParams.category_id = activeCategoryId;
  }

  const activeStatusLabel =
    PRODUCT_STATUS_FILTERS.find((f) => f.id === statusFilter)?.label ??
    "All Statuses";

  const categoryFilterLabel =
    activeCategoryId === ALL_CATEGORIES
      ? "All categories"
      : activeCategoryId === UNCATEGORIZED
        ? "Uncategorized"
        : (categories.find((c) => c.id === activeCategoryId)?.name ??
          "All categories");

  return (
    <>
      <AnimatePresence>
        {modal ? (
          <ProductManageModal
            key={modal.mode === "create" ? "create" : modal.product.id}
            mode={modal.mode}
            product={modal.mode === "edit" ? modal.product : undefined}
            categories={categories}
            brands={brands}
            onClose={() => {
              setModal(null);
              void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            }}
          />
        ) : null}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        <ProductsMetricsBar
          stats={stats}
          onExport={() => exportProductsCsv(filtered)}
          onImport={() => exportProductsCsv(products)}
          onCreate={() => setModal({ mode: "create" })}
        />

        <Card className="overflow-hidden border border-border py-0 ring-0">
          <CardContent className="flex flex-col gap-0 p-0">
            <div className="border-b p-2">
              <InputGroup className="h-9">
                <InputGroupAddon align="inline-start" className="pl-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <InputGroupButton
                          variant="ghost"
                          size="sm"
                          className="gap-1 px-2"
                        />
                      }
                    >
                      {activeStatusLabel}
                      <ChevronDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuGroup>
                        {PRODUCT_STATUS_FILTERS.map((option) => (
                          <DropdownMenuItem
                            key={option.id}
                            onClick={() => setStatusFilter(option.id)}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </InputGroupAddon>
                <InputGroupAddon align="inline-start" className="px-0">
                  <div className="h-4 w-px bg-border" aria-hidden />
                </InputGroupAddon>
                <InputGroupAddon align="inline-start">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <InputGroupButton
                          variant="ghost"
                          size="sm"
                          className="gap-1 px-2"
                        />
                      }
                    >
                      {categoryFilterLabel}
                      <ChevronDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => handleCategoryChange(ALL_CATEGORIES)}
                        >
                          All categories
                        </DropdownMenuItem>
                        {categories.map((category) => (
                          <DropdownMenuItem
                            key={category.id}
                            onClick={() => handleCategoryChange(category.id)}
                          >
                            {formatCategoryOptionLabel(category, categories)}
                          </DropdownMenuItem>
                        ))}
                        {stats.uncategorized > 0 ? (
                          <DropdownMenuItem
                            onClick={() => handleCategoryChange(UNCATEGORIZED)}
                          >
                            Uncategorized
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </InputGroupAddon>
                <InputGroupAddon align="inline-start" className="px-0">
                  <div className="h-4 w-px bg-border" aria-hidden />
                </InputGroupAddon>
                <InputGroupAddon align="inline-start">
                  <Search aria-hidden />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products, SKU, category..."
                />
                <InputGroupAddon align="inline-end" className="gap-1 pr-1">
                  <InputGroupButton
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Column view"
                  >
                    <Columns3 />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="px-2 pt-2">
              <ProductsBulkActionBar
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds(new Set())}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <Ban className="size-12 text-muted-foreground/30" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {isFiltering
                    ? "No products match your filters on this page."
                    : "No products yet."}
                </p>
                {isFiltering ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      handleCategoryChange(ALL_CATEGORIES);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setModal({ mode: "create" })}>
                    Add your first product
                  </Button>
                )}
              </div>
            ) : (
              <ProductsDataTable
                products={filtered}
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
                onEdit={(product) => setModal({ mode: "edit", product })}
              />
            )}

            <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
              <span>
                {isFiltering
                  ? `${filtered.length} of ${products.length} on this page`
                  : `${Math.min(products.length, total)} of ${total.toLocaleString("en-IN")} products`}
              </span>
            </div>

            {!isFiltering && total > products.length ? (
              <Pagination
                total={total}
                page={page}
                basePath="/admin/products"
                extraParams={listParams}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
