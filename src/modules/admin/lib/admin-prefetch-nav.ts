import type { QueryClient } from "@tanstack/react-query";

import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const STALE = 90_000;

/** Warm TanStack cache on sidebar hover for snappier navigations. */
export function prefetchAdminRoute(qc: QueryClient, href: string) {
  const p = href.split("?")[0];

  if (p === "/admin" || p === "") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.dashboard(),
      queryFn: () => adminGet("dashboard"),
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
      queryKey: adminQueryKeys.inventory(0),
      queryFn: () => adminGet("inventory?page=0"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/orders") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.orders("all", null, 0),
      queryFn: () => adminGet("orders"),
      staleTime: STALE,
    });
  }

  if (p === "/admin/purchase-orders") {
    return qc.prefetchQuery({
      queryKey: adminQueryKeys.purchaseOrders("all", null, 0),
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

  return Promise.resolve();
}
