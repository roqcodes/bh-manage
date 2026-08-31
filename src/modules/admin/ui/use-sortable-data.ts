"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export function useSortableData<T>(
  rows: T[],
  defaultKey?: keyof T & string,
  defaultDirection: SortDirection = "desc",
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDirection === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sortDirection === "asc" ? -1 : 1;
      if (as > bs) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDirection]);

  return { sorted, sortKey, sortDirection, toggleSort, setSortKey, setSortDirection };
}
