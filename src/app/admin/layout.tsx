"use client";

import type { ReactNode } from "react";

import { AdminAppShell } from "@/modules/admin/components/admin-app-shell";
import { AdminQueryProvider } from "@/modules/admin/providers/admin-query-provider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminQueryProvider>
      <AdminAppShell>{children}</AdminAppShell>
    </AdminQueryProvider>
  );
}
