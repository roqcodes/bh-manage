"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import type { ErpStockAdjustmentListRow } from "@/common/erp/inventory-types";
import { PAGE_SIZE } from "@/common/admin/types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { Pagination } from "@/modules/admin/components/pagination";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import {
  AdminDataTable,
  AdminListCard,
  AdminListFooter,
  AdminPageHeader,
  AdminPageLayout,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableLink,
  AdminTableRow,
  ErpListRowActions,
  SortableTableHead,
  useDebouncedValue,
  useErpFormModal,
  useSortableData,
} from "@/modules/admin/ui";
import { useActiveStoreScope } from "@/modules/erp/components/use-active-store-scope";
import { StockAdjustmentFormView } from "@/modules/admin/views/inventory/stock-adjustment-form-view";

export function StockAdjustmentsListView() {
  const searchParams = useSearchParams();
  const { activeStoreId, storeId } = useActiveStoreScope();
  const { isOpen, modalProps, openNew } = useErpFormModal("/admin/erp/stock-adjustments");
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<ErpStockAdjustmentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "adjustment_date",
    "desc",
  );

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    q.set("page", String(page));
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());
    if (storeId) q.set("storeId", storeId);
    adminGet<{ data: ErpStockAdjustmentListRow[]; total: number }>(
      `erp/stock-adjustments?${q.toString()}`,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, storeId, reloadToken, activeStoreId]);

  const listParams: Record<string, string> = {};
  if (storeId) listParams.storeId = storeId;
  if (debouncedSearch.trim()) listParams.search = debouncedSearch.trim();

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Stock adjustment"
        breadcrumb={[{ label: "Stock adjustment", href: "/admin/erp/stock-adjustments" }]}
        description="Manual stock corrections by store with cost impact for inventory valuation."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Add adjustment
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search adjustment number…"
        isEmpty={sorted.length === 0}
        emptyMessage="No stock adjustments yet."
        isFiltering={Boolean(debouncedSearch.trim())}
        onClearFilters={() => {
          setSearch("");
        }}
        footer={
          <AdminListFooter total={total} label="adjustments" page={page} pageSize={PAGE_SIZE} />
        }
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Number"
              sortKey="adjustment_number"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Store"
              sortKey="store_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Date"
              sortKey="adjustment_date"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Status"
              sortKey="status"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Add cost"
              sortKey="total_add_cost"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Remove cost"
              sortKey="total_remove_cost"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <TableHead className="w-28 text-right" />
          </AdminTableHeader>
          <AdminTableBody>
            {sorted.map((r) => (
              <AdminTableRow key={r.id}>
                <AdminTableCell>
                  <AdminTableLink
                    href={`/admin/erp/stock-adjustments/${r.id}`}
                    title={r.adjustment_number}
                  >
                    {formatErpDocRef("SA", r.id)}
                  </AdminTableLink>
                </AdminTableCell>
                <AdminTableCell>
                  {r.store_id && r.store_name ? (
                    <AdminTableLink href={`/admin/erp/stores/${r.store_id}/edit`}>
                      {r.store_name}
                    </AdminTableLink>
                  ) : (
                    (r.store_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell>{r.adjustment_date}</AdminTableCell>
                <AdminTableCell>
                  <StatusBadge status={r.status} />
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {formatCurrencyAmount(r.total_add_cost)}
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {formatCurrencyAmount(r.total_remove_cost)}
                </AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions viewHref={`/admin/erp/stock-adjustments/${r.id}`} />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      <Pagination
        total={total}
        page={page}
        basePath="/admin/erp/stock-adjustments"
        listParams={listParams}
      />

      {isOpen ? (
        <StockAdjustmentFormView
          variant="modal"
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
