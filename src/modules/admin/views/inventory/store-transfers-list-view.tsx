"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import type { ErpStoreTransferListRow } from "@/common/erp/inventory-types";
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
import { StoreTransferFormView } from "@/modules/admin/views/inventory/store-transfer-form-view";

export function StoreTransfersListView() {
  const searchParams = useSearchParams();
  const { stores } = useErpStores();
  const { isOpen, modalProps, openNew } = useErpFormModal("/admin/erp/store-transfers");
  const requestId = searchParams.get("requestId") ?? undefined;
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<ErpStoreTransferListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [fromStoreId, setFromStoreId] = useState(searchParams.get("fromStoreId") ?? "");
  const [toStoreId, setToStoreId] = useState(searchParams.get("toStoreId") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "transfer_date",
    "desc",
  );

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    q.set("page", String(page));
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());
    if (fromStoreId) q.set("fromStoreId", fromStoreId);
    if (toStoreId) q.set("toStoreId", toStoreId);
    adminGet<{ data: ErpStoreTransferListRow[]; total: number }>(
      `erp/store-transfers?${q.toString()}`,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, fromStoreId, toStoreId, reloadToken]);

  const storeOptions = useMemo(
    () => [
      { value: "", label: "All stores" },
      ...stores.map((s) => ({ value: s.id, label: s.name })),
    ],
    [stores],
  );

  const listParams: Record<string, string> = {};
  if (fromStoreId) listParams.fromStoreId = fromStoreId;
  if (toStoreId) listParams.toStoreId = toStoreId;
  if (debouncedSearch.trim()) listParams.search = debouncedSearch.trim();

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Store transfers"
        breadcrumb={[{ label: "Store transfers", href: "/admin/erp/store-transfers" }]}
        description="Completed stock movements between stores."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Add new transfer
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transfer number…"
        isEmpty={sorted.length === 0}
        emptyMessage="No store transfers yet."
        isFiltering={Boolean(debouncedSearch.trim()) || Boolean(fromStoreId) || Boolean(toStoreId)}
        onClearFilters={() => {
          setSearch("");
          setFromStoreId("");
          setToStoreId("");
        }}
        filters={[
          {
            id: "fromStore",
            label: "From",
            value: fromStoreId,
            options: storeOptions,
            onChange: setFromStoreId,
          },
          {
            id: "toStore",
            label: "To",
            value: toStoreId,
            options: storeOptions,
            onChange: setToStoreId,
          },
        ]}
        footer={<AdminListFooter total={total} label="transfers" page={page} pageSize={PAGE_SIZE} />}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Number"
              sortKey="transfer_number"
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
              sortKey="transfer_date"
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
                    href={`/admin/erp/store-transfers/${r.id}`}
                    title={r.transfer_number}
                  >
                    {formatErpDocRef("ST", r.id)}
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
                <AdminTableCell>{r.transfer_date}</AdminTableCell>
                <AdminTableCell>
                  <StatusBadge status={r.status} />
                </AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions viewHref={`/admin/erp/store-transfers/${r.id}`} />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      <Pagination
        total={total}
        page={page}
        basePath="/admin/erp/store-transfers"
        listParams={listParams}
      />

      {isOpen ? (
        <StoreTransferFormView
          variant="modal"
          requestId={requestId}
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
