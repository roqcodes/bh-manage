"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import type { ErpVendorCreditListRow } from "@/common/erp/purchasing-types";
import { PAGE_SIZE } from "@/common/admin/types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { Pagination } from "@/modules/admin/components/pagination";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
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
import { VendorCreditFormView } from "@/modules/admin/views/purchasing/vendor-credit-form-view";
import { useErpListState } from "@/modules/admin/ui/use-erp-list-state";

export function VendorCreditsListView() {
  const { isOpen, mode, editId, modalProps, openNew } = useErpFormModal("/admin/erp/vendor-credits");
  const [reloadToken, setReloadToken] = useState(0);
  const {
    search,
    setSearch,
    debouncedSearch,
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
  const [rows, setRows] = useState<ErpVendorCreditListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "credit_date",
    "desc",
  );

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), ...listParams });
    adminGet<{ data: ErpVendorCreditListRow[]; total: number }>(
      `erp/vendor-credits?${q.toString()}`,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, dateFrom, dateTo, reloadToken, listParams, activeStoreId]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch.trim()) return sorted;
    const q = debouncedSearch.trim().toLowerCase();
    return sorted.filter(
      (r) =>
        r.credit_number.toLowerCase().includes(q) ||
        formatErpDocRef("VC", r.id).toLowerCase().includes(q) ||
        (r.vendor_name?.toLowerCase().includes(q) ?? false) ||
        (r.store_name?.toLowerCase().includes(q) ?? false),
    );
  }, [sorted, debouncedSearch]);

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Vendor credits"
        breadcrumb={[{ label: "Vendor credits", href: "/admin/erp/vendor-credits" }]}
        description="Credits issued by vendors against purchase bills. Remaining balance can be applied to future bills."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Add vendor credit
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search credit number, vendor…"
        isEmpty={filteredRows.length === 0}
        emptyMessage="No vendor credits found."
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        dateRange={{
          from: dateFrom,
          to: dateTo,
          onFromChange: setDateFrom,
          onToChange: setDateTo,
        }}
        footer={<AdminListFooter total={total} label="credits" page={page} pageSize={PAGE_SIZE} />}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Number"
              sortKey="credit_number"
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
              label="Store"
              sortKey="store_name"
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
              label="Total"
              sortKey="total_amount"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Balance"
              sortKey="balance_remaining"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Date"
              sortKey="credit_date"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <TableHead className="w-28 text-right" />
          </AdminTableHeader>
          <AdminTableBody>
            {filteredRows.map((r) => (
              <AdminTableRow key={r.id}>
                <AdminTableCell>
                  <AdminTableLink
                    href={`/admin/erp/vendor-credits/${r.id}`}
                    title={r.credit_number}
                  >
                    {formatErpDocRef("VC", r.id)}
                  </AdminTableLink>
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
                  {r.store_id && r.store_name ? (
                    <AdminTableLink href={`/admin/erp/stores/${r.store_id}/edit`}>
                      {r.store_name}
                    </AdminTableLink>
                  ) : (
                    (r.store_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell>
                  <StatusBadge status={r.status} />
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {formatCurrencyAmount(r.total_amount)}
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {formatCurrencyAmount(r.balance_remaining)}
                </AdminTableCell>
                <AdminTableCell>{r.credit_date}</AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions
                    viewHref={`/admin/erp/vendor-credits/${r.id}`}
                    editHref={
                      r.status === "draft"
                        ? `/admin/erp/vendor-credits?form=edit&id=${r.id}`
                        : undefined
                    }
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
        basePath="/admin/erp/vendor-credits"
        listParams={listParams}
      />

      {isOpen ? (
        <VendorCreditFormView
          variant="modal"
          mode={mode}
          creditId={editId ?? undefined}
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
