"use client";

import { cn } from "@/lib/utils";

export const PO_ACCENT = {
  link: "text-primary hover:text-primary/80",
  selectedRow: "data-[state=selected]:bg-accent/60",
  selectionBar: "border-border bg-accent/50",
  focus: "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
} as const;

export type PurchaseOrdersViewFilter =
  | "all"
  | "pending"
  | "accepted"
  | "delivered"
  | "cancelled";

export const PURCHASE_ORDERS_VIEW_FILTERS: {
  id: PurchaseOrdersViewFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

import { formatCurrencyAmount } from "@/lib/format-currency";

export function formatInr(n: number) {
  return formatCurrencyAmount(n);
}

export { shortPoRef } from "@/lib/erp-document-ref";

export function matchesPoViewFilter(
  po: { status: string | null },
  filter: PurchaseOrdersViewFilter,
): boolean {
  if (filter === "all") return true;
  return po.status === filter;
}

export function PoStatusPill({ status }: { status: string | null }) {
  const normalized = status ?? "unknown";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        normalized === "delivered"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : normalized === "accepted"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : normalized === "cancelled"
              ? "border-border bg-muted text-muted-foreground"
              : normalized === "pending"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-border bg-muted text-muted-foreground",
      )}
    >
      {normalized}
    </span>
  );
}
