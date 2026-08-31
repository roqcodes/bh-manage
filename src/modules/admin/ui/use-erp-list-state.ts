"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useDebouncedValue } from "@/modules/admin/ui/use-debounced-value";

export function useErpListState(options?: {
  defaultStatus?: string;
  defaultStoreId?: string;
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(
    searchParams.get("status") ?? options?.defaultStatus ?? "all",
  );
  const [storeId, setStoreId] = useState(
    searchParams.get("storeId") ?? options?.defaultStoreId ?? "",
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const listParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (status !== "all") params.status = status;
    if (storeId) params.storeId = storeId;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [status, storeId, debouncedSearch, dateFrom, dateTo]);

  const isFiltering =
    Boolean(debouncedSearch.trim()) ||
    status !== "all" ||
    Boolean(storeId) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  function clearFilters() {
    setSearch("");
    setStatus(options?.defaultStatus ?? "all");
    setStoreId(options?.defaultStoreId ?? "");
    setDateFrom("");
    setDateTo("");
  }

  return {
    search,
    setSearch,
    debouncedSearch,
    status,
    setStatus,
    storeId,
    setStoreId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    listParams,
    isFiltering,
    clearFilters,
  };
}
