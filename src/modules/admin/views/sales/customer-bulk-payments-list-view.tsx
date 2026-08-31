"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";

import type { BulkCustomerPaymentBatchRow } from "@/common/erp/sales-types";
import { paymentModeLabel } from "@/common/erp/sales-types";
import { PAGE_SIZE } from "@/common/admin/types";
import { adminDelete, adminGet } from "@/modules/admin/lib/admin-api-client";
import { Pagination } from "@/modules/admin/components/pagination";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
import { Button } from "@/components/ui/button";
import { TableFooter, TableCell, TableHead, TableRow } from "@/components/ui/table";
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
  ErpListRowActions,
  SortableTableHead,
  useDebouncedValue,
  useErpFormModal,
  useSortableData,
} from "@/modules/admin/ui";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";
import { CustomerBulkPaymentFormView } from "@/modules/admin/views/sales/customer-bulk-payment-form-view";

const PERIOD_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "this_month", label: "This month" },
  { value: "today", label: "Today" },
];

function formatDisplayDate(value: string) {
  try {
    return format(parseISO(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

export function CustomerBulkPaymentsListView() {
  const searchParams = useSearchParams();
  const { stores } = useErpStores();
  const { isOpen, modalProps, openNew } = useErpFormModal("/admin/erp/customer-bulk-payments");
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<BulkCustomerPaymentBatchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [storeId, setStoreId] = useState(searchParams.get("storeId") ?? "");
  const [period, setPeriod] = useState(searchParams.get("period") ?? "this_month");
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
    q.set("page", String(page));
    if (storeId) q.set("storeId", storeId);
    if (period !== "all") q.set("period", period);
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());

    adminGet<{
      data: BulkCustomerPaymentBatchRow[];
      total: number;
      totalAmount: number;
    }>(`erp/customer-bulk-payments?${q.toString()}`)
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
        setTotalAmount(res.totalAmount);
      })
      .finally(() => setLoading(false));
  }, [page, storeId, period, debouncedSearch, reloadToken]);

  const storeOptions = useMemo(
    () => [
      { value: "", label: "All stores" },
      ...stores.map((s) => ({ value: s.id, label: s.name })),
    ],
    [stores],
  );

  const listParams: Record<string, string> = {};
  if (storeId) listParams.storeId = storeId;
  if (period !== "all") listParams.period = period;
  if (debouncedSearch.trim()) listParams.search = debouncedSearch.trim();

  async function handleDelete(batchId: string) {
    if (!confirm("Delete this bulk payment batch? Invoice balances will be recalculated.")) return;
    setDeletingId(batchId);
    try {
      await adminDelete(`erp/customer-bulk-payments/${encodeURIComponent(batchId)}`);
      setRows((prev) => prev.filter((r) => r.batch_id !== batchId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't delete bulk payment");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Bulk customer payments"
        breadcrumb={[{ label: "Payment bulk", href: "/admin/erp/customer-bulk-payments" }]}
        description="Record payments for multiple customers in one batch per store."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Add payment
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search store, account, receipt…"
        isEmpty={sorted.length === 0}
        emptyMessage="No bulk payments found."
        isFiltering={Boolean(debouncedSearch.trim()) || Boolean(storeId) || period !== "all"}
        onClearFilters={() => {
          setSearch("");
          setStoreId("");
          setPeriod("all");
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
            id: "period",
            label: "Period",
            value: period,
            options: PERIOD_OPTIONS,
            onChange: setPeriod,
          },
        ]}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span>{total} batches</span>
            <span className="font-semibold tabular-nums">
              Total amount paid: {formatCurrencyAmount(totalAmount)}
            </span>
          </div>
        }
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
              label="Total amount"
              sortKey="total_amount"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="right"
            />
            <SortableTableHead
              label="Receipts #"
              sortKey="receipts"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              className="hidden lg:table-cell"
            />
            <SortableTableHead
              label="Payment mode"
              sortKey="payment_mode"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Account"
              sortKey="account_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              className="hidden md:table-cell"
            />
            <SortableTableHead
              label="Customers"
              sortKey="customer_count"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              align="center"
            />
            <SortableTableHead
              label="Invoices"
              sortKey="invoices_count"
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
              className="hidden xl:table-cell"
            />
            <TableHead className="w-28 text-right" />
          </AdminTableHeader>
          <AdminTableBody>
            {sorted.map((row) => (
              <AdminTableRow key={row.batch_id}>
                <AdminTableCell>
                  <AdminTableLink href={`/admin/erp/customer-bulk-payments/${encodeURIComponent(row.batch_id)}`}>
                    {formatErpDocRef("CPM", row.batch_id)}
                  </AdminTableLink>
                </AdminTableCell>
                <AdminTableCell className="tabular-nums text-muted-foreground">
                  {formatDisplayDate(row.payment_date)}
                </AdminTableCell>
                <AdminTableCell className="max-w-[140px] truncate">
                  {row.store_name ?? "—"}
                </AdminTableCell>
                <AdminTableCell align="right" className="font-semibold tabular-nums">
                  {formatCurrencyAmount(row.total_amount)}
                </AdminTableCell>
                <AdminTableCell className="hidden max-w-[120px] truncate text-muted-foreground lg:table-cell">
                  {row.receipts ?? "—"}
                </AdminTableCell>
                <AdminTableCell>{paymentModeLabel(row.payment_mode)}</AdminTableCell>
                <AdminTableCell className="hidden text-muted-foreground md:table-cell">
                  {row.account_name ?? "—"}
                </AdminTableCell>
                <AdminTableCell align="center" className="tabular-nums">
                  {row.customer_count}
                </AdminTableCell>
                <AdminTableCell align="center" className="tabular-nums">
                  {row.invoices_count}
                </AdminTableCell>
                <AdminTableCell className="hidden text-muted-foreground xl:table-cell">
                  {row.created_by_name ?? "—"}
                </AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions
                    viewHref={`/admin/erp/customer-bulk-payments/${encodeURIComponent(row.batch_id)}`}
                    menuItems={[
                      {
                        label: "Delete",
                        destructive: true,
                        disabled: deletingId === row.batch_id,
                        onClick: () => void handleDelete(row.batch_id),
                      },
                    ]}
                  />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
          {sorted.length > 0 && (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="font-medium">
                  Page total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrencyAmount(sorted.reduce((s, r) => s + r.total_amount, 0))}
                </TableCell>
                <TableCell colSpan={6} />
              </TableRow>
            </TableFooter>
          )}
        </AdminDataTable>
      </AdminListCard>

      <Pagination
        page={page}
        total={total}
        basePath="/admin/erp/customer-bulk-payments"
        listParams={listParams}
      />

      {isOpen ? (
        <CustomerBulkPaymentFormView
          variant="modal"
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
