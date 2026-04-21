import { Suspense } from "react";

import { PageHeader } from "@/modules/admin/components/page-header";
import { listMyPurchaseOrders } from "@/modules/vendor/services/vendor-purchase-orders.service";
import {
  VENDOR_PO_STATUS_FILTERS,
  type VendorPoStatusFilter,
} from "@/modules/vendor/types";
import { VendorPurchaseOrdersPanel } from "@/modules/vendor/components/vendor-purchase-orders-panel";

export const dynamic = "force-dynamic";

function parseStatus(
  raw: string | undefined,
): VendorPoStatusFilter {
  if (raw && VENDOR_PO_STATUS_FILTERS.includes(raw as VendorPoStatusFilter)) {
    return raw as VendorPoStatusFilter;
  }
  return "pending";
}

export default async function VendorPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const page = Math.max(0, parseInt(params.page ?? "0", 10));

  const { data, total } = await listMyPurchaseOrders(status, page);

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <PageHeader
        title="Purchase orders"
        subtitle={`${total} PO${total !== 1 ? "s" : ""} with status “${status}”.`}
      />
      <Suspense>
        <VendorPurchaseOrdersPanel
          orders={data}
          total={total}
          page={page}
          statusFilter={status}
        />
      </Suspense>
    </div>
  );
}
