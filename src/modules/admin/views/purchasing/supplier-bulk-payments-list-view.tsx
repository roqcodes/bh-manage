"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import type { BulkSupplierPaymentBatchRow } from "@/common/erp/purchasing-types";
import { PAGE_SIZE } from "@/common/admin/types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
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
import { SupplierBulkPaymentFormView } from "@/modules/admin/views/purchasing/supplier-bulk-payment-views";

const PERIOD_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "this_month", label: "This month" },
];

export function SupplierBulkPaymentsListView() {
  const searchParams = useSearchParams();
  const { isOpen, modalProps, openNew } = useErpFormModal("/admin/erp/supplier-bulk-payments");
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<BulkSupplierPaymentBatchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [period, setPeriod] = useState(searchParams.get("period") ?? "all");
  const debouncedSearch = useDebouncedValue(search, 350);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "payment_date",
    "desc",
  );

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    q.set("view", "bulk");
    q.set("page", String(page));
    if (period !== "all") q.set("period", period);
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());

    adminGet<{ data: BulkSupplierPaymentBatchRow[]; total: number }>(
      `erp/supplier-payments?${q.toString()}`,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, period, debouncedSearch, reloadToken]);

  const listParams: Record<string, string> = {};
  if (period !== "all") listParams.period = period;
  if (debouncedSearch.trim()) listParams.search = debouncedSearch.trim();

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Supplier payments bulk"
        breadcrumb={[{ label: "Payment made bulk", href: "/admin/erp/supplier-bulk-payments" }]}
        description="Batch supplier payments applied across multiple bills in one transaction."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Add new
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search store, reference…"
        isEmpty={sorted.length === 0}
        emptyMessage="No bulk supplier payments found."
        isFiltering={Boolean(debouncedSearch.trim()) || period !== "all"}
        onClearFilters={() => {
          setSearch("");
          setPeriod("all");
        }}
        filters={[
          {
            id: "period",
            label: "Period",
            value: period,
            options: PERIOD_OPTIONS,
            onChange: setPeriod,
          },
        ]}
        footer={<AdminListFooter total={total} label="batches" page={page} pageSize={PAGE_SIZE} />}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Ref"
              sortKey="batch_id"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Payment date"
              sortKey="payment_date"
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
              label="Amount"
              sortKey="total_amount"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Suppliers"
              sortKey="supplier_count"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="center"
            />
            <SortableTableHead
              label="Created by"
              sortKey="created_by_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <TableHead className="w-28 text-right" />
          </AdminTableHeader>
          <AdminTableBody>
            {sorted.map((r) => (
              <AdminTableRow key={r.batch_id}>
                <AdminTableCell>
                  <AdminTableLink
                    href={`/admin/erp/supplier-bulk-payments/${encodeURIComponent(r.batch_id)}`}
                  >
                    {formatErpDocRef("SPM", r.batch_id)}
                  </AdminTableLink>
                </AdminTableCell>
                <AdminTableCell>{r.payment_date}</AdminTableCell>
                <AdminTableCell>{r.store_name ?? "—"}</AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {formatCurrencyAmount(r.total_amount)}
                </AdminTableCell>
                <AdminTableCell align="center">{r.supplier_count}</AdminTableCell>
                <AdminTableCell>{r.created_by_name ?? "—"}</AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions
                    viewHref={`/admin/erp/supplier-bulk-payments/${encodeURIComponent(r.batch_id)}`}
                  />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      <Pagination
        total={total}
        page={page}
        basePath="/admin/erp/supplier-bulk-payments"
        listParams={listParams}
      />

      {isOpen ? (
        <SupplierBulkPaymentFormView
          variant="modal"
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
