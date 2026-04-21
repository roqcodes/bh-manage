"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";

import { AdminRouteSuspense } from "@/modules/admin/components/admin-route-suspense";
import { AdminConfigView } from "@/modules/admin/views/admin-config-view";
import { AdminDashboardView } from "@/modules/admin/views/admin-dashboard-view";
import { AdminDeliveryView } from "@/modules/admin/views/admin-delivery-view";
import { AdminInventoryView } from "@/modules/admin/views/admin-inventory-view";
import { AdminOrderDetailView } from "@/modules/admin/views/admin-order-detail-view";
import { AdminOrdersView } from "@/modules/admin/views/admin-orders-view";
import { AdminProcurementView } from "@/modules/admin/views/admin-procurement-view";
import { AdminProductDetailView } from "@/modules/admin/views/admin-product-detail-view";
import { AdminProductsView } from "@/modules/admin/views/admin-products-view";
import { AdminPurchaseOrderByIdView } from "@/modules/admin/views/admin-purchase-order-detail-view";
import { AdminPurchaseOrdersView } from "@/modules/admin/views/admin-purchase-orders-view";
import { AdminUsersView } from "@/modules/admin/views/admin-users-view";
import { AdminVendorDetailView } from "@/modules/admin/views/admin-vendor-detail-view";
import { AdminVendorsView } from "@/modules/admin/views/admin-vendors-view";

function AdminNotFound() {
  return (
    <div className="px-4 py-10 text-sm font-semibold text-slate-600 sm:px-8">
      This admin page does not exist.
    </div>
  );
}

export function AdminCatchAllView() {
  const params = useParams();
  const slug = ((params.slug as string[] | undefined) ?? []).slice();

  let inner: ReactNode;

  if (slug.length === 0) {
    inner = <AdminDashboardView />;
  } else if (slug.length === 1) {
    const seg = slug[0];
    if (seg === "products") inner = <AdminProductsView />;
    else if (seg === "orders") inner = <AdminOrdersView />;
    else if (seg === "vendors") inner = <AdminVendorsView />;
    else if (seg === "inventory") inner = <AdminInventoryView />;
    else if (seg === "delivery") inner = <AdminDeliveryView />;
    else if (seg === "users") inner = <AdminUsersView />;
    else if (seg === "config") inner = <AdminConfigView />;
    else if (seg === "procurement") inner = <AdminProcurementView />;
    else if (seg === "purchase-orders") inner = <AdminPurchaseOrdersView />;
    else inner = <AdminNotFound />;
  } else if (slug.length === 2) {
    const [a, b] = slug;
    if (!b || b.length === 0) {
      inner = <AdminNotFound />;
    } else if (a === "products") inner = <AdminProductDetailView />;
    else if (a === "orders") inner = <AdminOrderDetailView />;
    else if (a === "vendors") inner = <AdminVendorDetailView />;
    else if (a === "purchase-orders") inner = <AdminPurchaseOrderByIdView />;
    else inner = <AdminNotFound />;
  } else {
    inner = <AdminNotFound />;
  }

  return <AdminRouteSuspense>{inner}</AdminRouteSuspense>;
}
