import Link from "next/link";
import { Package, ClipboardList } from "lucide-react";

import { PageHeader } from "@/modules/admin/components/page-header";
import { VendorStatsRow } from "@/modules/vendor/components/vendor-stats-row";
import { VendorPoActivityFeed } from "@/modules/vendor/components/vendor-po-activity-feed";
import {
  getVendorDashboardStats,
  getVendorRecentPurchaseOrders,
} from "@/modules/vendor/services/vendor-dashboard.service";

export const dynamic = "force-dynamic";

export default async function VendorHomePage() {
  const [stats, recent] = await Promise.all([
    getVendorDashboardStats(),
    getVendorRecentPurchaseOrders(8),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <PageHeader
        title="Vendor home"
        subtitle="Overview of purchase orders and your supply catalog."
      />

      <div className="mb-8">
        <VendorStatsRow stats={stats} />
      </div>

      <div className="mb-8">
        <VendorPoActivityFeed recent={recent} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/vendor/products"
          className="group flex flex-col rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_16px_rgba(26,26,46,0.04)] transition hover:border-[#2563EB]/20"
        >
          <Package
            className="mb-3 text-slate-300 transition group-hover:text-[#2563EB]"
            size={28}
          />
          <h2 className="text-lg font-extrabold text-slate-900">Supply</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update stock and base prices for your assigned variants.
          </p>
        </Link>

        <Link
          href="/vendor/purchase-orders"
          className="group flex flex-col rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_16px_rgba(26,26,46,0.04)] transition hover:border-[#2563EB]/20"
        >
          <ClipboardList
            className="mb-3 text-slate-300 transition group-hover:text-[#2563EB]"
            size={28}
          />
          <h2 className="text-lg font-extrabold text-slate-900">
            Purchase orders
          </h2>
          
          <p className="mt-1 text-sm text-slate-500">
            Review POs, accept them, and mark delivery to update central stock.
          </p>
        </Link>
      </div>
    </div>
  );
}
