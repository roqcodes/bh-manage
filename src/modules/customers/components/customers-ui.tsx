"use client";

import type { AdminUser } from "@/common/admin/types";
import { cn } from "@/lib/utils";

export type CustomerStatusFilter = "all" | "active" | "blocked";

export const CUSTOMER_STATUS_FILTERS: {
  id: CustomerStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "blocked", label: "Blocked" },
];

export function formatCustomerId(user: AdminUser) {
  const shortId = user.id.split("-")[0]?.slice(0, 4).toUpperCase() ?? "0000";
  return `CUS-${shortId}`;
}

export function isCustomerBlocked(user: AdminUser) {
  return user.is_verified === false;
}

export function matchesCustomerStatusFilter(
  user: AdminUser,
  filter: CustomerStatusFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return user.is_verified !== false;
    case "blocked":
      return user.is_verified === false;
    default:
      return true;
  }
}

export function CustomerStatusBadge({ user }: { user: AdminUser }) {
  const blocked = isCustomerBlocked(user);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        blocked
          ? "bg-rose-100 text-rose-800"
          : "bg-emerald-100 text-emerald-800",
      )}
    >
      {blocked ? "Blocked" : "Active"}
    </span>
  );
}
