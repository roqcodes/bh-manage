import { notFound } from "next/navigation";

import { getMyPurchaseOrderById } from "@/modules/vendor/services/vendor-purchase-orders.service";
import { VendorPurchaseOrderDetailView } from "@/modules/vendor/components/vendor-po-detail";

export const dynamic = "force-dynamic";

export default async function VendorPurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getMyPurchaseOrderById(id);

  if (!po) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <VendorPurchaseOrderDetailView po={po} />
    </div>
  );
}
