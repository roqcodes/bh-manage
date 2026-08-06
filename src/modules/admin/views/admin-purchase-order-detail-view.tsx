"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { useParams } from "next/navigation";

import type { AdminPurchaseOrderDetail } from "@/common/admin/types";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { AdminPurchaseOrderDetailView as PurchaseOrderDetailBody } from "@/modules/purchase-orders/components/admin-purchase-order-detail";
import { adminGetNullable } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

type PoDetailPayload = { po: AdminPurchaseOrderDetail };

function shortPoRef(id: string) {
  return `${id.slice(0, 8)}…`;
}

export function AdminPurchaseOrderByIdView() {
  const params = useParams();
  const slug = (params.slug as string[] | undefined) ?? [];
  const id =
    slug[0] === "purchase-orders" && typeof slug[1] === "string"
      ? slug[1]
      : "";

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.purchaseOrderDetail(id),
    queryFn: () => adminGetNullable<PoDetailPayload>(`purchase-orders/${id}`),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  if (!id) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-4">
        <p className="text-sm font-semibold text-slate-600">
          Missing purchase order id.
        </p>
      </div>
    );
  }

  if (isPending && data === undefined) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-4">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5">
          <AlertTriangle className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-900">
              Failed to load purchase order.
            </p>
            <p className="mt-1 text-[13px] font-medium text-rose-700">
              {error instanceof Error ? error.message : "Unknown error."}
            </p>
          </div>
        </div>
        <Link
          href="/admin/purchase-orders"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
        >
          <ChevronLeft className="size-4" aria-hidden />
          All purchase orders
        </Link>
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-4">
        <Link
          href="/admin/purchase-orders"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
        >
          <ChevronLeft className="size-4" aria-hidden />
          All purchase orders
        </Link>
        <p className="text-[15px] font-medium text-slate-600">
          This purchase order could not be found.
        </p>
      </div>
    );
  }

  const { po } = data;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-3 sm:px-4 sm:py-4">
      <Link
        href="/admin/purchase-orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
      >
        <ChevronLeft className="size-4" aria-hidden />
        All purchase orders
      </Link>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        PO {shortPoRef(po.id)}
      </h1>

      <PurchaseOrderDetailBody po={po} />
    </div>
  );
}
