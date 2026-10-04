import type { QueryClient } from "@tanstack/react-query";

import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import type { ErpContextQueryData } from "@/modules/erp/components/use-erp-stores";

const STALE = 90_000;

/** Warm TanStack cache on sidebar hover for snappier navigations. */
export function prefetchAdminRoute(qc: QueryClient, href: string) {
  const p = href.split("?")[0];

  if (p === "/admin" || p === "") {
    const ctx = qc.getQueryData<ErpContextQueryData>(adminQueryKeys.erpContext());
    const storeId = ctx?.context?.store_id;
    if (!storeId) return Promise.resolve();
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.dashboard(storeId, undefined, undefined, "month", "core"),
      queryFn: () =>
        adminGet(`dashboard?storeId=${encodeURIComponent(storeId)}&section=core`),
      staleTime: STALE,
    });
  }

  if (p === "/admin/products") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.products(0, null),
      queryFn: () =>
        adminGet("products?page=0"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/categories") {
    return qc.prefetchQuery({
      queryKey: ["admin", "categories"],
      queryFn: () => adminGet("categories"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/brands") {
    return qc.prefetchQuery({
      queryKey: ["admin", "brands"],
      queryFn: () => adminGet("brands"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/vendors") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.vendors(0),
      queryFn: () => adminGet("vendors?page=0"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/inventory") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.inventory(0, null),
      queryFn: () => adminGet("inventory?page=0"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/orders") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.orders("all", null, 0),
      queryFn: () => adminGet("orders?channel=online"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/erp/sales-orders") {
    const ctx = qc.getQueryData<ErpContextQueryData>(adminQueryKeys.erpContext());
    const storeId = ctx?.context?.store_id ?? "";
    if (!storeId) return Promise.resolve();
    const qs = `?storeId=${encodeURIComponent(storeId)}`;
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.salesOrders("all", null, 0, storeId),
      queryFn: () => adminGet(`erp/sales-orders${qs}`),
      staleTime: STALE,
    });
  }

  if (p === "/admin/analytics") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.analytics(""),
      queryFn: () => adminGet("analytics"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/purchase-orders") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.purchaseOrders("all", null, null, 0),
      queryFn: () => adminGet("purchase-orders"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/users") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.users("users", "vendor", 0),
      queryFn: () => adminGet("users?tab=users&segment=vendor"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/delivery") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.delivery(),
      queryFn: () => adminGet("delivery"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/business") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.appSettings(),
      queryFn: () => adminGet("settings"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/config/push") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.pushNotifications(),
      queryFn: () => adminGet("push-notifications"),
      staleTime: STALE,
    });
  }

  return Promise.resolve();
}
