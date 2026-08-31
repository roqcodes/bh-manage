"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Plus } from "lucide-react";

import type { ErpInvoiceListRow } from "@/common/erp/sales-types";
import { adminDelete, adminGet } from "@/modules/admin/lib/admin-api-client";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { Pagination } from "@/modules/admin/components/pagination";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
import { Button } from "@/components/ui/button";
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
  useErpFormModal,
  useSortableData,
} from "@/modules/admin/ui";
import { InvoiceFormView } from "@/modules/admin/views/sales/invoice-form-view";
import { TableHead } from "@/components/ui/table";
import { useErpListState } from "@/modules/admin/ui/use-erp-list-state";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { PAGE_SIZE } from "@/common/admin/types";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "issued", label: "Issued" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export function InvoicesListView() {
  const { isOpen, mode, editId, modalProps, openNew } = useErpFormModal("/admin/erp/invoices");
  const [reloadToken, setReloadToken] = useState(0);
  const {
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
    activeStoreId,
  } = useErpListState();
  const [rows, setRows] = useState<ErpInvoiceListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancellingId, startCancel] = useTransition();
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "created_at",
    "desc",
  );

  function reload() {
    const q = new URLSearchParams({ page: String(page), ...listParams });
    return adminGet<{ data: ErpInvoiceListRow[]; total: number }>(
      `erp/invoices?${q.toString()}`,
    ).then((res) => {
      setRows(res.data);
      setTotal(res.total);
    });
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [page, debouncedSearch, status, storeId, dateFrom, dateTo, reloadToken, activeStoreId]);

  function cancelInvoice(invoiceId: string) {
    startCancel(async () => {
      await adminDelete(`erp/invoices/${invoiceId}`);
      await reload();
    });
  }

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Invoices"
        breadcrumb={[{ label: "Invoices", href: "/admin/erp/invoices" }]}
        description="Store and online invoices with payment status. Use filters to narrow by store, status, or date range."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download data-icon="inline-start" />
              Export
            </Button>
            <Button size="sm" onClick={() => openNew()}>
              <Plus data-icon="inline-start" />
              Create invoice
            </Button>
          </>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Invoice number or customer…"
        isEmpty={sorted.length === 0}
        emptyMessage="No invoices found."
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        dateRange={{
          from: dateFrom,
          to: dateTo,
          onFromChange: setDateFrom,
          onToChange: setDateTo,
        }}
        filters={[
          {
            id: "status",
            label: "Status",
            value: status,
            options: STATUS_OPTIONS,
            onChange: setStatus,
          },
        ]}
        footer={<AdminListFooter total={total} label="invoices" page={page} pageSize={PAGE_SIZE} />}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Date"
              sortKey="created_at"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Number"
              sortKey="invoice_number"
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
              className="hidden md:table-cell"
            />
            <SortableTableHead
              label="Customer"
              sortKey="customer_name"
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
              label="Due"
              sortKey="due_date"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              className="hidden lg:table-cell"
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
              label="Balance"
              sortKey="balance_due"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <TableHead className="w-28 text-right" />
          </AdminTableHeader>
          <AdminTableBody>
            {sorted.map((row) => (
              <AdminTableRow key={row.id}>
                <AdminTableCell className="text-muted-foreground">
                  {row.created_at?.slice(0, 10)}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminTableLink
                    href={`/admin/erp/invoices/${row.id}`}
                    title={row.invoice_number}
                  >
                    {formatErpDocRef("INV", row.id)}
                  </AdminTableLink>
                </AdminTableCell>
                <AdminTableCell className="hidden max-w-[120px] truncate text-muted-foreground md:table-cell">
                  {row.store_id && row.store_name ? (
                    <AdminTableLink href={`/admin/erp/stores/${row.store_id}/edit`}>
                      {row.store_name}
                    </AdminTableLink>
                  ) : (
                    (row.store_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell className="max-w-[160px] truncate">
                  {row.customer_name ?? "—"}
                </AdminTableCell>
                <AdminTableCell>
                  <StatusBadge status={row.status} />
                </AdminTableCell>
                <AdminTableCell className="hidden text-muted-foreground lg:table-cell">
                  {row.due_date ?? "—"}
                </AdminTableCell>
                <AdminTableCell align="right" className="font-semibold tabular-nums">
                  {formatCurrencyAmount(row.total_amount)}
                </AdminTableCell>
                <AdminTableCell align="right" className="font-semibold tabular-nums">
                  {formatCurrencyAmount(row.balance_due)}
                </AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions
                    viewHref={`/admin/erp/invoices/${row.id}`}
                    editHref={`/admin/erp/invoices?form=edit&id=${row.id}`}
                    editDisabled={
                      row.amount_paid > 0 ||
                      row.credits_applied > 0 ||
                      row.status === "cancelled"
                    }
                    printHref={`/admin/erp/invoices/${row.id}/print`}
                    menuItems={[
                      {
                        label: "Add payment",
                        href: `/admin/erp/payments/new?invoiceId=${encodeURIComponent(row.id)}`,
                        disabled: row.balance_due <= 0 || row.status === "cancelled",
                      },
                      {
                        label: "Cancel invoice",
                        destructive: true,
                        separatorBefore: true,
                        disabled:
                          Boolean(cancellingId) ||
                          row.amount_paid > 0 ||
                          row.credits_applied > 0 ||
                          row.status === "cancelled",
                        onClick: () => cancelInvoice(row.id),
                      },
                    ]}
                  />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      <Pagination total={total} page={page} basePath="/admin/erp/invoices" listParams={listParams} />

      {isOpen ? (
        <InvoiceFormView
          variant="modal"
          mode={mode}
          invoiceId={editId ?? undefined}
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
