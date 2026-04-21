import type { ReactNode } from "react";

import { VendorSidebar } from "@/modules/vendor/components/vendor-sidebar";
import { requireVendorAreaAccess } from "@/modules/auth/services/auth-guard.service";

export const dynamic = "force-dynamic";

export default async function VendorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireVendorAreaAccess();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <VendorSidebar profile={profile} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
