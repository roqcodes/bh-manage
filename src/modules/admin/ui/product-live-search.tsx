"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Plus, Search } from "lucide-react";

import type { ErpProductSearchRow } from "@/common/erp/purchasing-types";
import type { ErpSalesProductSearchRow } from "@/common/erp/sales-types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { useDebouncedValue } from "@/modules/admin/ui/use-debounced-value";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/format-currency";

export type ProductCatalogType = "sales" | "purchase";
export type ProductLiveSearchRow = ErpProductSearchRow | ErpSalesProductSearchRow;

type ProductLiveSearchProps = {
  catalog: ProductCatalogType;
  storeId?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minChars?: number;
  onSelect?: (row: ProductLiveSearchRow) => void;
  renderResult?: (row: ProductLiveSearchRow, dismiss: () => void) => ReactNode;
  /** Purchase catalog only — show inline create affordance. */
  allowCreate?: boolean;
  onCreateRequest?: (query: string) => void;
};

function isSalesRow(row: ProductLiveSearchRow): row is ErpSalesProductSearchRow {
  return "available_stock" in row;
}

export function ProductLiveSearch({
  catalog,
  storeId,
  disabled,
  placeholder = "Search product by name or barcode…",
  className,
  minChars = 1,
  onSelect,
  renderResult,
  allowCreate = false,
  onCreateRequest,
}: ProductLiveSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductLiveSearchRow[]>([]);
  const debouncedQuery = useDebouncedValue(query, 200);

  const fetchResults = useCallback(
    async (q: string) => {
      if (catalog === "sales") {
        const params = new URLSearchParams({ q });
        if (storeId) params.set("storeId", storeId);
        const res = await adminGet<{ data: ErpSalesProductSearchRow[] }>(
          `erp/sales-catalog?${params.toString()}`,
        );
        return res.data;
      }
        const res = await adminGet<{ data: ErpProductSearchRow[] }>(
          `erp/purchase-catalog?q=${encodeURIComponent(q)}`,
        );
      return res.data;
    },
    [catalog, storeId],
  );

  function dismiss() {
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  function handleSelect(row: ProductLiveSearchRow) {
    onSelect?.(row);
    dismiss();
  }

  useEffect(() => {
    if (!open || disabled) return;
    const q = debouncedQuery.trim();
    if (q.length < minChars) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchResults(q)
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, disabled, fetchResults, minChars]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const trimmedQuery = debouncedQuery.trim();
  const canCreate = allowCreate && Boolean(onCreateRequest) && catalog === "purchase";
  const showDropdown =
    open &&
    !disabled &&
    (loading || results.length > 0 || trimmedQuery.length >= minChars || canCreate);

  function requestCreate() {
    onCreateRequest?.(query.trim());
    dismiss();
  }

  return (
    <div
      ref={rootRef}
      data-enter-nav={open ? "off" : undefined}
      className={cn("relative w-full", className)}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          className="h-10 pr-9 pl-9"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : trimmedQuery.length < minChars ? (
            canCreate ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={requestCreate}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-sm font-medium text-primary transition hover:bg-muted"
              >
                <Plus className="size-4 shrink-0" />
                Create new product
              </button>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Type to search products
              </p>
            )
          ) : results.length === 0 ? (
            canCreate ? (
              <div className="py-1">
                <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                  No products found for &ldquo;{trimmedQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={requestCreate}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-sm font-medium text-primary transition hover:bg-muted"
                >
                  <Plus className="size-4 shrink-0" />
                  Create &ldquo;{trimmedQuery}&rdquo;
                </button>
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No products found</p>
            )
          ) : renderResult ? (
            results.map((row) => (
              <div key={row.id} className="rounded-md px-1 py-0.5">
                {renderResult(row, () => handleSelect(row))}
              </div>
            ))
          ) : (
            results.map((row) => (
              <button
                key={row.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(row)}
                className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {row.product_name}
                  </p>
                  {row.barcode ? (
                    <p className="truncate text-xs text-muted-foreground">Barcode: {row.barcode}</p>
                  ) : null}
                </div>
                {isSalesRow(row) ? (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    Stock: {row.available_stock} · {formatCurrencyAmount(row.sales_price ?? 0)}
                  </span>
                ) : null}
              </button>
            ))
          )}
          {canCreate && results.length > 0 ? (
            <div className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={requestCreate}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-primary transition hover:bg-muted"
              >
                <Plus className="size-3.5 shrink-0" />
                {trimmedQuery ? `Create "${trimmedQuery}"` : "Create new product"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
