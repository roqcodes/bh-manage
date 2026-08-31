"use client";

import { useEffect, useMemo, useState } from "react";

import type { StockDetailRow } from "@/common/erp/inventory-types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import {
  AdminDataTable,
  AdminListCard,
  AdminPageHeader,
  AdminPageLayout,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
  SortableTableHead,
  useDebouncedValue,
  useSortableData,
} from "@/modules/admin/ui";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";

function StockBadge({ value }: { value: number }) {
  const variant = value <= 0 ? "destructive" : value < 10 ? "outline" : "secondary";
  return (
    <Badge variant={variant} className="tabular-nums">
      {value}
    </Badge>
  );
}

export function StockDetailsListView() {
  const { stores, activeStoreId } = useErpStores();
  const [rows, setRows] = useState<StockDetailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "product_name",
    "asc",
  );

  const activeStoreName =
    stores.find((s) => s.id === (storeId || activeStoreId))?.name ?? stores[0]?.name ?? "—";

  useEffect(() => {
    if (activeStoreId && !storeId) setStoreId(activeStoreId);
  }, [activeStoreId, storeId]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: "0" });
    if (storeId) q.set("storeId", storeId);
    adminGet<{ data: StockDetailRow[]; total: number }>(`erp/stock-details?${q.toString()}`)
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  const storeOptions = useMemo(
    () => [
      { value: "", label: "All stores" },
      ...stores.map((s) => ({ value: s.id, label: s.name })),
    ],
    [stores],
  );

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return sorted;
    const q = debouncedSearch.trim().toLowerCase();
    return sorted.filter(
      (r) =>
        r.product_name.toLowerCase().includes(q) ||
        (r.barcode?.toLowerCase().includes(q) ?? false),
    );
  }, [sorted, debouncedSearch]);

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Stock details"
        breadcrumb={[{ label: "Stock details", href: "/admin/erp/stock-details" }]}
        description="Current stock levels by product for the selected store."
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Viewing:</span>
        <Badge variant="outline">{activeStoreName}</Badge>
      </div>

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search product or barcode…"
        isEmpty={filtered.length === 0}
        emptyMessage="No stock records found."
        isFiltering={Boolean(debouncedSearch.trim()) || Boolean(storeId)}
        onClearFilters={() => {
          setSearch("");
          setStoreId(activeStoreId ?? "");
        }}
        filters={[
          {
            id: "store",
            label: "Store",
            value: storeId,
            options: storeOptions,
            onChange: setStoreId,
          },
        ]}
        footer={<span>{total} items</span>}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Product"
              sortKey="product_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Barcode"
              sortKey="barcode"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Central stock"
              sortKey="central_stock"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Store stock"
              sortKey="store_stock"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Purchase price"
              sortKey="purchase_price"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Sales price"
              sortKey="sales_price"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
          </AdminTableHeader>
          <AdminTableBody>
            {filtered.map((r) => (
              <AdminTableRow key={r.variant_id}>
                <AdminTableCell className="font-medium">{r.product_name}</AdminTableCell>
                <AdminTableCell>{r.barcode ?? "—"}</AdminTableCell>
                <AdminTableCell align="right">
                  <StockBadge value={r.central_stock} />
                </AdminTableCell>
                <AdminTableCell align="right">
                  {r.store_stock != null ? <StockBadge value={r.store_stock} /> : "—"}
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {r.purchase_price != null ? formatCurrencyAmount(r.purchase_price) : "—"}
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {r.sales_price != null ? formatCurrencyAmount(r.sales_price) : "—"}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>
    </AdminPageLayout>
  );
}
