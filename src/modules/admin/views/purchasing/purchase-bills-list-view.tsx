"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import type { ErpPurchaseBillListRow } from "@/common/erp/purchasing-types";
import { PAGE_SIZE } from "@/common/admin/types";
import { adminDelete, adminGet } from "@/modules/admin/lib/admin-api-client";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { Pagination } from "@/modules/admin/components/pagination";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { displayErpDocumentNumber } from "@/lib/erp-document-ref";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { StatusBadge } from "@/modules/admin/components/status-badge";
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
import { PurchaseBillFormView } from "@/modules/admin/views/purchasing/purchase-bill-form-view";
import { useErpListState } from "@/modules/admin/ui/use-erp-list-state";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "finalized", label: "Finalized" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export function PurchaseBillsListView() {
  const { isOpen, mode, editId, modalProps, openNew } = useErpFormModal("/admin/erp/purchase-bills");
  const [reloadToken, setReloadToken] = useState(0);
  const {
    search,
    setSearch,
    debouncedSearch,
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    listParams,
    isFiltering,
    clearFilters,
  } = useErpListState();
  const [rows, setRows] = useState<ErpPurchaseBillListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancellingId, startCancel] = useTransition();
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "purchase_date",
    "desc",
  );

  function reload() {
    const q = new URLSearchParams({ page: String(page), ...listParams });
    return adminGet<{ data: ErpPurchaseBillListRow[]; total: number }>(
      `erp/purchase-bills?${q.toString()}`,
    ).then((res) => {
      setRows(res.data);
      setTotal(res.total);
    });
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [page, debouncedSearch, status, dateFrom, dateTo, reloadToken]);

  function handleCancel(id: string) {
    startCancel(async () => {
      await adminDelete(`erp/purchase-bills/${id}`);
      await reload();
    });
  }

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Purchase bills"
        breadcrumb={[{ label: "Purchase bills", href: "/admin/erp/purchase-bills" }]}
        description="Vendor purchase bills and amounts payable. Draft bills can be edited; finalized bills accept supplier payments."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Create purchase bill
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bill, vendor bill, batch…"
        isEmpty={sorted.length === 0}
        emptyMessage="No purchase bills found."
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
        footer={<AdminListFooter total={total} label="bills" page={page} pageSize={PAGE_SIZE} />}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Date"
              sortKey="purchase_date"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Bill #"
              sortKey="purchase_bill_number"
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
              label="PO"
              sortKey="po_number"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Vendor"
              sortKey="vendor_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Status"
              sortKey="display_status"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Total"
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
            {sorted.map((r) => {
              const canCancel =
                r.status !== "cancelled" && r.amount_paid === 0 && r.balance_due === r.total_amount;
              const canEdit = r.status === "draft";
              return (
                <AdminTableRow key={r.id}>
                  <AdminTableCell>{r.purchase_date}</AdminTableCell>
                  <AdminTableCell>
                    <AdminTableLink href={`/admin/erp/purchase-bills/${r.id}`}>
                      {displayErpDocumentNumber(r.purchase_bill_number, "PB", r.id)}
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
                  <AdminTableCell>
                    {r.po_id ? (
                      <AdminTableLink href={`/admin/purchase-orders/${r.po_id}`}>
                        {displayErpDocumentNumber(r.po_number, "PO", r.po_id)}
                      </AdminTableLink>
                    ) : (
                      "—"
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    {r.vendor_id && r.vendor_name ? (
                      <AdminTableLink href={`/admin/vendors/${r.vendor_id}/erp`}>
                        {r.vendor_name}
                      </AdminTableLink>
                    ) : (
                      (r.vendor_name ?? "—")
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    <StatusBadge status={r.display_status} />
                  </AdminTableCell>
                  <AdminTableCell align="right" className="tabular-nums">
                    {formatCurrencyAmount(r.total_amount)}
                  </AdminTableCell>
                  <AdminTableCell align="right" className="tabular-nums">
                    {formatCurrencyAmount(r.balance_due)}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    <ErpListRowActions
                      viewHref={`/admin/erp/purchase-bills/${r.id}`}
                      editHref={canEdit ? `/admin/erp/purchase-bills?form=edit&id=${r.id}` : undefined}
                      printHref={`/admin/erp/purchase-bills/${r.id}/print`}
                      menuItems={
                        canCancel
                          ? [
                              {
                                label: "Cancel",
                                destructive: true,
                                separatorBefore: true,
                                onClick: () => {
                                  if (confirm("Cancel this purchase bill?")) handleCancel(r.id);
                                },
                              },
                            ]
                          : []
                      }
                    />
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      <Pagination
        total={total}
        page={page}
        basePath="/admin/erp/purchase-bills"
        listParams={listParams}
      />

      {isOpen ? (
        <PurchaseBillFormView
          variant="modal"
          mode={mode}
          billId={editId ?? undefined}
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
