"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, LayoutDashboard } from "lucide-react";

import {
  PURCHASE_ORDER_STATUS_FILTERS,
  type AdminPurchaseOrderListRow,
  type PurchaseOrderCatalogStats,
  type PurchaseOrderStatusFilter,
  type Vendor,
} from "@/common/admin/types";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { AdminPurchaseOrdersPanel } from "@/modules/purchase-orders/components/admin-purchase-orders-panel";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

function parsePoStatus(raw: string | null | undefined): PurchaseOrderStatusFilter {
  const t = raw?.trim();
  if (t && (PURCHASE_ORDER_STATUS_FILTERS as readonly string[]).includes(t)) {
    return t as PurchaseOrderStatusFilter;
  }
  return "all";
}

export function AdminPurchaseOrdersView() {
  const searchParams = useSearchParams();
  const status = parsePoStatus(searchParams.get("status"));
  const rawVendor = searchParams.get("vendorId")?.trim();
  const vendorId = rawVendor && rawVendor.length > 0 ? rawVendor : null;
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.purchaseOrders(status, vendorId, page),
    queryFn: () => {
      const q = new URLSearchParams();
      if (status !== "all") q.set("status", status);
      if (vendorId) q.set("vendorId", vendorId);
      if (page > 0) q.set("page", String(page));
      const qs = q.toString();
      return adminGet<{
        data: AdminPurchaseOrderListRow[];
        total: number;
        page: number;
        status: PurchaseOrderStatusFilter;
        vendorId: string | null;
        filterVendors: Pick<Vendor, "id" | "name">[];
        stats: PurchaseOrderCatalogStats;
      }>(`purchase-orders${qs ? `?${qs}` : ""}`);
    },
    placeholderData: keepPreviousData,
  });

  if (isPending && !data) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5">
          <AlertTriangle className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-900">
              Failed to load purchase orders.
            </p>
            <p className="mt-1 text-[13px] font-medium text-rose-700">
              {error instanceof Error ? error.message : "Unknown error."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <AdminPageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">

      </div>
      <AdminPurchaseOrdersPanel
        orders={data.data}
        total={data.total}
        page={data.page}
        statusFilter={data.status}
        filterVendors={data.filterVendors}
        selectedVendorId={data.vendorId}
        stats={data.stats}
      />
    </div>
  );
}
