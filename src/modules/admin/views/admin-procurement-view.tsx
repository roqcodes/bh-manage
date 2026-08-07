"use client";

import { ProcurementWorkspace } from "@/modules/procurement/components/procurement-workspace";

export function AdminProcurementView() {
  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4">
      <ProcurementWorkspace />
    </div>
  );
}
