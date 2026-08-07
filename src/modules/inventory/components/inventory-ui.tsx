"use client";

import { cn } from "@/lib/utils";

export const INVENTORY_ACCENT = {
  link: "text-primary hover:text-primary/80",
  selectedRow: "data-[state=selected]:bg-accent/60",
  selectionBar: "border-border bg-accent/50",
  focus: "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
} as const;

export type InventoryViewFilter = "all" | "healthy" | "low" | "critical";

export const INVENTORY_VIEW_FILTERS: {
  id: InventoryViewFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "low", label: "Low stock" },
  { id: "critical", label: "Critical" },
];

export function formatSku(variantId: string) {
  return variantId.slice(0, 8).toUpperCase();
}

export function stockUnits(stock: number | null | undefined) {
  return Math.max(0, Math.floor(Number(stock ?? 0)));
}

export function stockLevelFor(
  stock: number | null | undefined,
): Exclude<InventoryViewFilter, "all"> {
  const units = stockUnits(stock);
  if (units < 1) return "critical";
  if (units < 10) return "low";
  return "healthy";
}

export function matchesInventoryViewFilter(
  row: { stock: number | null | undefined },
  filter: InventoryViewFilter,
): boolean {
  if (filter === "all") return true;
  return stockLevelFor(row.stock) === filter;
}

const TITLE_CASE_SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "in",
  "on",
  "at",
  "to",
  "of",
  "with",
]);

export function toTitleCase(
  value: string | null | undefined,
  fallback = "—",
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return fallback;

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && TITLE_CASE_SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function StockStatusPill({
  stock,
}: {
  stock: number | null | undefined;
}) {
  const level = stockLevelFor(stock);

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        level === "critical"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : level === "low"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {level === "critical"
        ? "Out of stock"
        : level === "low"
          ? "Low stock"
          : "Healthy"}
    </span>
  );
}
