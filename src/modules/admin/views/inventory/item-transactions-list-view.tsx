"use client";

import { useEffect, useMemo, useState } from "react";

import type { ItemTransactionRow } from "@/common/erp/inventory-types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { formatCurrencyAmount } from "@/lib/format-currency";
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
  useDebouncedValue,
  useSortableData,
} from "@/modules/admin/ui";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";

const TRANSACTION_TYPES = [
  "all",
  "receipt",
  "sale",
  "adjustment",
  "transfer",
  "transfer_out",
  "transfer_in",
  "purchase",
  "return",
  "damaged",
  "vendor_credit",
];

export function ItemTransactionsListView() {
  const { stores, activeStoreId } = useErpStores();
  const [rows, setRows] = useState<ItemTransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("");
  const [type, setType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "created_at",
    "desc",
  );

  useEffect(() => {
    if (activeStoreId && !storeId) setStoreId(activeStoreId);
  }, [activeStoreId, storeId]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (storeId) q.set("storeId", storeId);
    if (type !== "all") q.set("type", type);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());
    adminGet<{ data: ItemTransactionRow[]; total: number }>(
      `erp/item-transactions?${q.toString()}`,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [storeId, type, dateFrom, dateTo, debouncedSearch]);

  const storeOptions = useMemo(
    () => [
      { value: "", label: "All stores" },
      ...stores.map((s) => ({ value: s.id, label: s.name })),
    ],
    [stores],
  );

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Item transactions"
        breadcrumb={[{ label: "Item transactions", href: "/admin/erp/item-transactions" }]}
        description="Read-only ledger of stock movements across stores."
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search item, barcode, invoice…"
        isEmpty={sorted.length === 0}
        emptyMessage="No item transactions found."
        isFiltering={type !== "all" || Boolean(storeId) || Boolean(dateFrom) || Boolean(dateTo)}
        onClearFilters={() => {
          setSearch("");
          setType("all");
          setDateFrom("");
          setDateTo("");
          setStoreId(activeStoreId ?? "");
        }}
        dateRange={{
          from: dateFrom,
          to: dateTo,
          onFromChange: setDateFrom,
          onToChange: setDateTo,
        }}
        filters={[
          {
            id: "store",
            label: "Store",
            value: storeId,
            options: storeOptions,
            onChange: setStoreId,
          },
          {
            id: "type",
            label: "Type",
            value: type,
            options: TRANSACTION_TYPES.map((t) => ({
              value: t,
              label: t === "all" ? "All types" : t,
            })),
            onChange: setType,
          },
        ]}
        footer={<span>{total} transactions</span>}
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
              label="Store"
              sortKey="store_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Type"
              sortKey="type"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Item"
              sortKey="product_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Invoice/Ref"
              sortKey="invoice_number"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Qty"
              sortKey="quantity"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Price"
              sortKey="transaction_price"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Balance"
              sortKey="balance_after"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
          </AdminTableHeader>
          <AdminTableBody>
            {sorted.map((r) => (
              <AdminTableRow key={r.id}>
                <AdminTableCell className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
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
                <AdminTableCell>{r.type}</AdminTableCell>
                <AdminTableCell>
                  {r.product_name}
                  {r.variant_name ? ` — ${r.variant_name}` : ""}
                </AdminTableCell>
                <AdminTableCell>{r.invoice_number ?? r.reference_type ?? "—"}</AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {r.quantity}
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {r.transaction_price != null ? formatCurrencyAmount(r.transaction_price) : "—"}
                </AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {r.balance_after != null ? r.balance_after : "—"}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>
    </AdminPageLayout>
  );
}
