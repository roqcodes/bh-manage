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
import { StoreInventoryPurchaseGlancePopover } from "@/modules/erp/components/store-inventory-purchase-glance-popover";
import { StoreInventoryProductDetailDialog } from "@/modules/erp/components/store-inventory-product-detail-dialog";
import { useActiveStoreScope } from "@/modules/erp/components/use-active-store-scope";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";

function StockBadge({ value }: { value: number }) {
  const variant =
    value < 0 ? "destructive" : value <= 0 ? "destructive" : value < 10 ? "outline" : "secondary";
  return (
    <Badge variant={variant} className="tabular-nums">
      {value}
      {value < 0 ? " short" : null}
    </Badge>
  );
}

export function StoreInventoryListView() {
  const { stores } = useErpStores();
  const { storeId } = useActiveStoreScope();
  const [rows, setRows] = useState<StockDetailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "product_name",
    "asc",
  );

  const activeStoreName =
    stores.find((s) => s.id === storeId)?.name ?? stores[0]?.name ?? "—";

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
        title="Store inventory"
        breadcrumb={[{ label: "Store inventory", href: "/admin/erp/store-inventory" }]}
        description="On-hand stock, costs, and pricing for the selected store. Click a row for full purchase and sales history."
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
        emptyMessage="No inventory records found."
        isFiltering={Boolean(debouncedSearch.trim())}
        onClearFilters={() => {
          setSearch("");
        }}
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
              <AdminTableRow
                key={r.product_id}
                onClick={() => setDetailProductId(r.product_id)}
              >
                <AdminTableCell className="font-medium">{r.product_name}</AdminTableCell>
                <AdminTableCell>{r.barcode ?? "—"}</AdminTableCell>
                <AdminTableCell align="right">
                  <StockBadge value={r.central_stock} />
                </AdminTableCell>
                <AdminTableCell align="right">
                  {r.store_stock != null ? <StockBadge value={r.store_stock} /> : "—"}
                </AdminTableCell>
                <AdminTableCell align="right">
                  {r.purchase_price != null ? (
                    <StoreInventoryPurchaseGlancePopover
                      productId={r.product_id}
                      storeId={storeId}
                      displayPrice={formatCurrencyAmount(r.purchase_price)}
                    />
                  ) : (
                    "—"
                  )}
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {r.sales_price != null ? formatCurrencyAmount(r.sales_price) : "—"}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      <StoreInventoryProductDetailDialog
        productId={detailProductId}
        storeId={storeId}
        open={detailProductId != null}
        onOpenChange={(open) => {
          if (!open) setDetailProductId(null);
        }}
      />
    </AdminPageLayout>
  );
}

/** @deprecated Use StoreInventoryListView */
export const StockDetailsListView = StoreInventoryListView;
