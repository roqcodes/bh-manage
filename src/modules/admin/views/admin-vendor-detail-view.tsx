"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

import type {
  Vendor,
  VendorProductWithVariant,
  VariantWithProduct,
} from "@/common/admin/types";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { VendorDetailPanel } from "@/modules/vendors/components/vendor-detail-panel";
import { adminGetNullable } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

type VendorDetailPayload = {
  vendor: Vendor;
  vendorProducts: VendorProductWithVariant[];
  availableVariants: VariantWithProduct[];
};

export function AdminVendorDetailView() {
  const params = useParams();
  const slug = (params.slug as string[] | undefined) ?? [];
  const id =
    slug[0] === "vendors" && typeof slug[1] === "string" ? slug[1] : "";

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.vendorDetail(id),
    queryFn: () => adminGetNullable<VendorDetailPayload>(`vendors/${id}`),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  if (!id) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-4">
        <p className="text-sm font-medium text-slate-600">Missing vendor id.</p>
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
              Failed to load vendor.
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
      <div className="mx-auto w-full max-w-[1200px] space-y-4 px-3 py-3 sm:px-4 sm:py-4">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All vendors
        </Link>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
          <p className="text-sm font-medium text-slate-500">
            This vendor could not be found.
          </p>
        </div>
      </div>
    );
  }

  const { vendor, vendorProducts, availableVariants } = data;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-3 py-3 sm:px-4 sm:py-4">
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All vendors
      </Link>

      <VendorDetailPanel
        vendor={vendor}
        vendorProducts={vendorProducts}
        availableVariants={availableVariants}
      />
    </div>
  );
}
