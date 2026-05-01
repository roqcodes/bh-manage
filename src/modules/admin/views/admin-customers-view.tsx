"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import type { AdminUser } from "@/common/admin/types";
import { PageHeader } from "@/modules/admin/components/page-header";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { CustomersPanel } from "@/modules/customers/components/customers-panel";
import { CustomersStatCards } from "@/modules/customers/components/customers-stat-cards";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import type { CustomerStats } from "@/modules/customers/services/customers.service";

export function AdminCustomersView() {
  const searchParams = useSearchParams();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.customersList(page),
    queryFn: () => {
      return adminGet<{
        data: AdminUser[];
        total: number;
        stats: CustomerStats;
      }>(`customers?page=${page}`);
    },
    placeholderData: keepPreviousData,
  });

  if (isPending && !data) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className="px-4 py-10 text-sm font-semibold text-red-600 sm:px-8">
        {error instanceof Error ? error.message : "Failed to load customers."}
      </div>
    );
  }
  if (!data) return <AdminPageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <PageHeader title="Customers" subtitle="All registered users and customers." />
      
      {data.stats && <CustomersStatCards stats={data.stats} />}

      <CustomersPanel
        users={data.data}
        total={data.total}
        page={page}
      />
    </div>
  );
}
