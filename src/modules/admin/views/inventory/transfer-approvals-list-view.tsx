"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { ErpTransferRequestListRow } from "@/common/erp/inventory-types";
import { adminGet, adminPost } from "@/modules/admin/lib/admin-api-client";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import {
  AdminDataTable,
  AdminListCard,
  AdminPageHeader,
  AdminPageLayout,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableLink,
  AdminTableRow,
  SortableTableHead,
  useSortableData,
} from "@/modules/admin/ui";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";

export function TransferApprovalsListView() {
  const { stores, activeStoreId } = useErpStores();
  const [rows, setRows] = useState<ErpTransferRequestListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromStoreId, setFromStoreId] = useState(activeStoreId ?? "");
  const [actingId, startAction] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "request_date",
    "desc",
  );

  useEffect(() => {
    if (activeStoreId && !fromStoreId) setFromStoreId(activeStoreId);
  }, [activeStoreId, fromStoreId]);

  function reload() {
    setLoading(true);
    const q = new URLSearchParams({ page: "0", status: "submitted" });
    if (fromStoreId) q.set("fromStoreId", fromStoreId);
    adminGet<{ data: ErpTransferRequestListRow[] }>(`erp/transfer-requests?${q.toString()}`)
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, [fromStoreId]);

  const storeOptions = useMemo(
    () => [
      { value: "", label: "All stores" },
      ...stores.map((s) => ({ value: s.id, label: s.name })),
    ],
    [stores],
  );

  function approve(id: string) {
    setError(null);
    startAction(async () => {
      try {
        await adminPost(`erp/transfer-requests/${id}`, { action: "approve" });
        reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approval failed");
      }
    });
  }

  function reject(id: string) {
    if (!confirm("Reject this transfer request?")) return;
    setError(null);
    startAction(async () => {
      try {
        await adminPost(`erp/transfer-requests/${id}`, { action: "reject" });
        reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rejection failed");
      }
    });
  }

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Stock transfer approvals"
        breadcrumb={[{ label: "Transfer approvals", href: "/admin/erp/transfer-approvals" }]}
        description="Approve requests from other stores. Stock moves immediately on approval."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AdminListCard
        search=""
        onSearchChange={() => {}}
        isEmpty={sorted.length === 0}
        emptyMessage="No pending transfer requests for approval."
        isFiltering={Boolean(fromStoreId)}
        onClearFilters={() => setFromStoreId("")}
        filters={[
          {
            id: "fromStore",
            label: "Supplying store",
            value: fromStoreId,
            options: storeOptions,
            onChange: setFromStoreId,
          },
        ]}
        footer={<span>{sorted.length} pending</span>}
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
              label="From (supply)"
              sortKey="from_store_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="To (requesting)"
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
                  <AdminTableLink href={`/admin/erp/transfer-requests/${r.id}`}>
                    {r.request_number}
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
                  <div className="flex justify-end gap-2">
                    <Button size="sm" disabled={actingId} onClick={() => approve(r.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={actingId} onClick={() => reject(r.id)}>
                      Reject
                    </Button>
                  </div>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>
    </AdminPageLayout>
  );
}
