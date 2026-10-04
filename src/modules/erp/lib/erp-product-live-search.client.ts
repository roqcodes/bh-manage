"use client";

import type { QueryClient } from "@tanstack/react-query";

import type { ErpProductSearchRow } from "@/common/erp/purchasing-types";
import type { ErpSalesProductSearchRow } from "@/common/erp/sales-types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import type { ProductCatalogType } from "@/modules/admin/ui/product-live-search";
import {
  rpcSearchPurchaseCatalog,
  rpcSearchSalesCatalog,
} from "@/modules/erp/lib/catalog-typeahead-rpc.client";

/** Keystroke search; React Query dedupes in-flight calls. */
export const ERP_PRODUCT_SEARCH_DEBOUNCE_MS = 0;

/** Purchase metadata in search can be briefly stale; refetch in background. */
export const ERP_PURCHASE_SEARCH_STALE_MS = 60_000;

/** Sales: dedupe + show prior hits; do not treat cache as stock authority. */
export const ERP_SALES_SEARCH_STALE_MS = 5_000;

export const ERP_PRODUCT_SEARCH_GC_MS = 5 * 60_000;

const PICKER_LIMIT = "20";

export function erpProductLiveSearchQueryKey(
  catalog: ProductCatalogType,
  storeId: string | undefined,
  query: string,
) {
  return adminQueryKeys.erpProductLiveSearch(catalog, storeId, query);
}

async function fetchErpProductLiveSearchViaApi(
  catalog: ProductCatalogType,
  query: string,
  storeId?: string,
): Promise<ErpProductSearchRow[] | ErpSalesProductSearchRow[]> {
  if (catalog === "sales") {
    const params = new URLSearchParams({ q: query, limit: PICKER_LIMIT });
    if (storeId) params.set("storeId", storeId);
    const res = await adminGet<{ data: ErpSalesProductSearchRow[] }>(
      `erp/sales-catalog?${params.toString()}`,
    );
    return res.data;
  }
  const res = await adminGet<{ data: ErpProductSearchRow[] }>(
    `erp/purchase-catalog?q=${encodeURIComponent(query)}&limit=${PICKER_LIMIT}`,
  );
  return res.data;
}

export async function fetchErpProductLiveSearch(
  catalog: ProductCatalogType,
  query: string,
  storeId?: string,
): Promise<ErpProductSearchRow[] | ErpSalesProductSearchRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (catalog === "sales") {
    const rpcRows = await rpcSearchSalesCatalog(trimmed, storeId);
    if (rpcRows) return rpcRows;
  } else {
    const rpcRows = await rpcSearchPurchaseCatalog(trimmed);
    if (rpcRows) return rpcRows;
  }

  return fetchErpProductLiveSearchViaApi(catalog, trimmed, storeId);
}

export function invalidateErpProductLiveSearchQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ["admin", "erp-product-search"],
  });
}

/** Product admin mutations: list + ERP live search (prefix invalidation). */
export async function invalidateAdminProductCatalogQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    invalidateErpProductLiveSearchQueries(queryClient),
  ]);
}
