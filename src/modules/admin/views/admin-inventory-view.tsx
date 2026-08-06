"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import type { InventoryCatalogStats, InventoryWithVariant } from "@/common/admin/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { InventoryPanel } from "@/modules/inventory/components/inventory-panel";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import { adminPageClass } from "@/modules/admin/lib/admin-layout";

type InventoryPayload = {
  data: InventoryWithVariant[];
  total: number;
  page: number;
  stats: InventoryCatalogStats;
};

export function AdminInventoryView() {
  const searchParams = useSearchParams();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminQueryKeys.inventory(page),
    queryFn: () => adminGet<InventoryPayload>(`inventory?page=${page}`),
    placeholderData: keepPreviousData,
  });

  if (isPending && !data) return <AdminPageSkeleton />;
  if (isError) {
    return (
      <div className={adminPageClass}>
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Failed to load inventory</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!data) return <AdminPageSkeleton />;

  return (
    <div className={adminPageClass}>
      <InventoryPanel
        inventory={data.data}
        total={data.total}
        page={data.page}
        stats={data.stats}
      />
    </div>
  );
}
