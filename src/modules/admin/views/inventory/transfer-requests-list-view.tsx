"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import type { ErpTransferRequestListRow } from "@/common/erp/inventory-types";
import { PAGE_SIZE } from "@/common/admin/types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { Pagination } from "@/modules/admin/components/pagination";
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
import { useErpStores } from "@/modules/erp/components/use-erp-stores";
import { TransferRequestFormView } from "@/modules/admin/views/inventory/transfer-request-form-view";

export function TransferRequestsListView() {
  const searchParams = useSearchParams();
  const { activeStoreId } = useErpStores();
  const { isOpen, modalProps, openNew } = useErpFormModal("/admin/erp/transfer-requests");
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<ErpTransferRequestListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "request_date",
    "desc",
  );

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    q.set("page", String(page));
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());
    adminGet<{ data: ErpTransferRequestListRow[]; total: number }>(
      `erp/transfer-requests?${q.toString()}`,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, reloadToken, activeStoreId]);

  const listParams: Record<string, string> = {};
  if (debouncedSearch.trim()) listParams.search = debouncedSearch.trim();

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Stock transfer requests"
        breadcrumb={[{ label: "Transfer requests", href: "/admin/erp/transfer-requests" }]}
        description="Requests from one store to another for stock replenishment."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            New request
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search request number…"
        isEmpty={sorted.length === 0}
        emptyMessage="No transfer requests yet."
        isFiltering={Boolean(debouncedSearch.trim())}
        onClearFilters={() => {
          setSearch("");
        }}
        footer={<AdminListFooter total={total} label="requests" page={page} pageSize={PAGE_SIZE} />}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Number"
              sortKey="request_number"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="From"
              sortKey="from_store_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="To"
              sortKey="to_store_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Date"
              sortKey="request_date"
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
            <TableHead className="w-28 text-right" />
          </AdminTableHeader>
          <AdminTableBody>
            {sorted.map((r) => (
              <AdminTableRow key={r.id}>
                <AdminTableCell>
                  <AdminTableLink
                    href={`/admin/erp/transfer-requests/${r.id}`}
                    title={r.request_number}
                  >
                    {formatErpDocRef("TR", r.id)}
                  </AdminTableLink>
                </AdminTableCell>
                <AdminTableCell>
                  {r.from_store_id && r.from_store_name ? (
                    <AdminTableLink href={`/admin/erp/stores/${r.from_store_id}/edit`}>
                      {r.from_store_name}
                    </AdminTableLink>
                  ) : (
                    (r.from_store_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell>
                  {r.to_store_id && r.to_store_name ? (
                    <AdminTableLink href={`/admin/erp/stores/${r.to_store_id}/edit`}>
                      {r.to_store_name}
                    </AdminTableLink>
                  ) : (
                    (r.to_store_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell>{r.request_date}</AdminTableCell>
                <AdminTableCell>
                  <StatusBadge status={r.status} />
                </AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions viewHref={`/admin/erp/transfer-requests/${r.id}`} />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      <Pagination
        total={total}
        page={page}
        basePath="/admin/erp/transfer-requests"
        listParams={listParams}
      />

      {isOpen ? (
        <TransferRequestFormView
          variant="modal"
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
