"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";

import type { ErpExpenseListRow } from "@/common/erp/purchasing-types";
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
import { ExpenseFormView } from "@/modules/admin/views/purchasing/expense-form-view";

const PERIOD_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "this_month", label: "This month" },
  { value: "today", label: "Today" },
];

function formatDisplayDate(value: string) {
  try {
    return format(parseISO(value), "dd-MMM-yyyy");
  } catch {
    return value;
  }
}

export function ExpensesListView() {
  const searchParams = useSearchParams();
  const { stores } = useErpStores();
  const { isOpen, mode, editId, modalProps, openNew } = useErpFormModal("/admin/erp/expenses");
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<ErpExpenseListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [storeId, setStoreId] = useState(searchParams.get("storeId") ?? "");
  const [period, setPeriod] = useState(searchParams.get("period") ?? "this_month");
  const [accountId, setAccountId] = useState(searchParams.get("accountId") ?? "");
  const [expenseAccounts, setExpenseAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const debouncedSearch = useDebouncedValue(search, 350);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const { sorted, sortKey, sortDirection, toggleSort } = useSortableData(
    rows,
    "expense_date",
    "desc",
  );

  useEffect(() => {
    const q = storeId
      ? `?view=accounts&storeId=${encodeURIComponent(storeId)}`
      : "?view=accounts";
    adminGet<{ data: Array<{ id: string; name: string }> }>(`erp/expenses${q}`).then((res) =>
      setExpenseAccounts(res.data),
    );
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    q.set("page", String(page));
    if (storeId) q.set("storeId", storeId);
    if (period !== "all") q.set("period", period);
    if (accountId) q.set("accountId", accountId);
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());

    adminGet<{ data: ErpExpenseListRow[]; total: number; totalAmount: number }>(
      `erp/expenses?${q.toString()}`,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
        setTotalAmount(res.totalAmount);
      })
      .finally(() => setLoading(false));
  }, [page, storeId, period, accountId, debouncedSearch, reloadToken]);

  const storeOptions = useMemo(
    () => [
      { value: "", label: "All stores" },
      ...stores.map((s) => ({ value: s.id, label: s.name })),
    ],
    [stores],
  );

  const accountOptions = useMemo(
    () => [
      { value: "", label: "All expense types" },
      ...expenseAccounts.map((a) => ({ value: a.id, label: a.name })),
    ],
    [expenseAccounts],
  );

  const listParams: Record<string, string> = {};
  if (storeId) listParams.storeId = storeId;
  if (period !== "all") listParams.period = period;
  if (accountId) listParams.accountId = accountId;
  if (debouncedSearch.trim()) listParams.search = debouncedSearch.trim();

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    try {
      await adminDelete(`erp/expenses/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't delete expense");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Expenses"
        breadcrumb={[{ label: "Expenses", href: "/admin/erp/expenses" }]}
        description="Operating expenses and petty cash spend by store. Filter by expense account type or period."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Add expense
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference, notes…"
        isEmpty={sorted.length === 0}
        emptyMessage="No expenses found."
        isFiltering={
          Boolean(debouncedSearch.trim()) || Boolean(storeId) || Boolean(accountId) || period !== "all"
        }
        onClearFilters={() => {
          setSearch("");
          setStoreId("");
          setAccountId("");
          setPeriod("all");
        }}
        filters={[
          { id: "store", label: "Store", value: storeId, options: storeOptions, onChange: setStoreId },
          { id: "period", label: "Period", value: period, options: PERIOD_OPTIONS, onChange: setPeriod },
          {
            id: "account",
            label: "Expense type",
            value: accountId,
            options: accountOptions,
            onChange: setAccountId,
          },
        ]}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span>{total} expenses</span>
            <span className="font-semibold tabular-nums">
              Total: {formatCurrencyAmount(totalAmount)}
            </span>
          </div>
        }
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Date"
              sortKey="expense_date"
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
              label="Expense account"
              sortKey="account_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Reference"
              sortKey="reference"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              className="hidden md:table-cell"
            />
            <SortableTableHead
              label="Vendor"
              sortKey="vendor_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              className="hidden lg:table-cell"
            />
            <SortableTableHead
              label="Paid through"
              sortKey="paid_through_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Customer"
              sortKey="customer_name"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
              className="hidden xl:table-cell"
            />
            <SortableTableHead
              label="Amount"
              sortKey="total_amount"
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
                <AdminTableCell className="tabular-nums text-muted-foreground">
                  {formatDisplayDate(row.expense_date)}
                </AdminTableCell>
                <AdminTableCell className="max-w-[140px] truncate text-sm">
                  {row.store_id && row.store_name ? (
                    <AdminTableLink href={`/admin/erp/stores/${row.store_id}/edit`}>
                      {row.store_name}
                    </AdminTableLink>
                  ) : (
                    (row.store_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell>{row.account_name ?? "—"}</AdminTableCell>
                <AdminTableCell className="hidden max-w-[160px] truncate md:table-cell">
                  <AdminTableLink
                    href={`/admin/erp/expenses/${row.id}`}
                    title={row.expense_number}
                  >
                    {formatErpDocRef("EXP", row.id)}
                  </AdminTableLink>
                </AdminTableCell>
                <AdminTableCell className="hidden text-muted-foreground lg:table-cell">
                  {row.vendor_name ?? "—"}
                </AdminTableCell>
                <AdminTableCell className="text-sm text-muted-foreground">
                  {row.paid_through_name ?? "—"}
                </AdminTableCell>
                <AdminTableCell className="hidden text-muted-foreground xl:table-cell">
                  {row.customer_name ?? "—"}
                </AdminTableCell>
                <AdminTableCell align="right" className="font-semibold tabular-nums">
                  {formatCurrencyAmount(row.total_amount)}
                </AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions
                    viewHref={`/admin/erp/expenses/${row.id}`}
                    editHref={`/admin/erp/expenses?form=edit&id=${row.id}`}
                    menuItems={[
                      {
                        label: "Delete",
                        destructive: true,
                        separatorBefore: true,
                        disabled: deletingId === row.id,
                        onClick: () => void handleDelete(row.id),
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
                <TableCell colSpan={7} className="font-medium">
                  Page total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrencyAmount(sorted.reduce((s, r) => s + r.total_amount, 0))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </AdminDataTable>
      </AdminListCard>

      <Pagination
        page={page}
        total={total}
        basePath="/admin/erp/expenses"
        listParams={listParams}
        pageSize={PAGE_SIZE}
      />

      {isOpen ? (
        <ExpenseFormView
          variant="modal"
          mode={mode}
          expenseId={editId ?? undefined}
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
