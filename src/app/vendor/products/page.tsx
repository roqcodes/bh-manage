import { Suspense } from "react";

import { PageHeader } from "@/modules/admin/components/page-header";
import {
  listAvailableCatalogVariants,
  listMyVendorProducts,
} from "@/modules/vendor/services/vendor-products.service";
import { VendorProductsPanel } from "@/modules/vendor/components/vendor-products-panel";
import { VendorAvailableVariantsPanel } from "@/modules/vendor/components/vendor-available-variants-panel";
import { VendorSupplyTabNav } from "@/modules/vendor/components/vendor-supply-tab-nav";

export const dynamic = "force-dynamic";

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const tab = params.tab === "add" ? "add" : "my";
  const page = Math.max(0, parseInt(params.page ?? "0", 10));

  if (tab === "my") {
    const { data, total } = await listMyVendorProducts(page);
    const subtitle = `${total} catalog line${total !== 1 ? "s" : ""} on your supply list.`;

    return (
      <div className="mx-auto w-full max-w-6xl px-8 py-10">
        <PageHeader title="Supply" subtitle={subtitle} />
        <VendorSupplyTabNav active="my" />
        <Suspense>
          <VendorProductsPanel rows={data} total={total} page={page} />
        </Suspense>
      </div>
    );
  }

  const { data, total } = await listAvailableCatalogVariants(page);
  const subtitle = `${total} active variant${total !== 1 ? "s" : ""} you can add.`;

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <PageHeader title="Supply" subtitle={subtitle} />
      <VendorSupplyTabNav active="add" />
      <Suspense>
        <VendorAvailableVariantsPanel rows={data} total={total} page={page} />
      </Suspense>
    </div>
  );
}
