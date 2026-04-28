"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";

import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { adminGetNullable } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import { CustomerDetailPanel } from "@/modules/customers/components/customer-detail-panel";
import type { CustomerDetailsResponse } from "@/modules/customers/services/customers.service";

export function AdminCustomerDetailView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params.slug as string[] | undefined) ?? [];
  const id = slug[0] === "customers" && typeof slug[1] === "string" ? slug[1] : "";

  const txPage = Math.max(0, parseInt(searchParams.get("txPage") ?? "0", 10));

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.customerDetail(id, txPage),
    queryFn: () => adminGetNullable<CustomerDetailsResponse>(`customers/${id}?txPage=${txPage}`),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  if (!id) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-slate-600">Missing customer id.</p>
      </div>
    );
  }

  if (isPending && data === undefined) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5">
          <AlertTriangle className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-900">
              Failed to load customer.
            </p>
            <p className="mt-1 text-[13px] font-medium text-rose-700">
              {error instanceof Error ? error.message : "Unknown error."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <Link
          href="/admin/users?segment=stores"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All customers
        </Link>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
          <p className="text-sm font-medium text-slate-500">
            This customer could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <Link
        href="/admin/users?segment=stores"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All customers
      </Link>

      <CustomerDetailPanel details={data} txPage={txPage} orders={data.orders} />
    </div>
  );
}
