"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

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
import { useErpFormModal } from "@/modules/admin/ui";
import { PurchaseOrderFormView } from "@/modules/admin/views/purchasing/purchase-order-form-view";

function parsePoStatus(raw: string | null | undefined): PurchaseOrderStatusFilter {
  const t = raw?.trim();
  if (t && (PURCHASE_ORDER_STATUS_FILTERS as readonly string[]).includes(t)) {
    return t as PurchaseOrderStatusFilter;
  }
  return "all";
}

export function AdminPurchaseOrdersView() {
  const { isOpen, mode, editId, modalProps } = useErpFormModal("/admin/purchase-orders");
  const [reloadToken, setReloadToken] = useState(0);
  const searchParams = useSearchParams();
  const status = parsePoStatus(searchParams.get("status"));
  const rawVendor = searchParams.get("vendorId")?.trim();
  const vendorId = rawVendor && rawVendor.length > 0 ? rawVendor : null;
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const { data, isPending, isError, error } = useQuery({
    queryKey: [...adminQueryKeys.purchaseOrders(status, vendorId, page), reloadToken],
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
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-4">
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
    <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4">
      <AdminPurchaseOrdersPanel
        orders={data.data}
        total={data.total}
        page={data.page}
        statusFilter={data.status}
        filterVendors={data.filterVendors}
        selectedVendorId={data.vendorId}
        stats={data.stats}
      />

      {isOpen ? (
        <PurchaseOrderFormView
          variant="modal"
          mode={mode}
          poId={editId ?? undefined}
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </div>
  );
}
