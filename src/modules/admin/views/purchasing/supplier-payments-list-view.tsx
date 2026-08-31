"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import type {
  ErpSupplierPaymentListRow,
  SupplierPaymentModeTotals,
} from "@/common/erp/purchasing-types";
import { ERP_SUPPLIER_PAYMENT_MODES } from "@/common/erp/purchasing-types";
import { PAGE_SIZE } from "@/common/admin/types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import { Pagination } from "@/modules/admin/components/pagination";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { SupplierPaymentFormView } from "@/modules/admin/views/purchasing/supplier-payment-form-view";

const PERIOD_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "this_month", label: "This month" },
];

const PAYMENT_MODE_OPTIONS = [
  { value: "all", label: "All payment modes" },
  ...ERP_SUPPLIER_PAYMENT_MODES.map((m) => ({ value: m, label: m })),
];

export function SupplierPaymentsListView() {
  const searchParams = useSearchParams();
  const { isOpen, modalProps, openNew } = useErpFormModal("/admin/erp/supplier-payments");
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<ErpSupplierPaymentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [modeTotals, setModeTotals] = useState<SupplierPaymentModeTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [paymentMode, setPaymentMode] = useState(searchParams.get("paymentMode") ?? "all");
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
    q.set("page", String(page));
    q.set("isBulk", "false");
    if (paymentMode !== "all") q.set("paymentMode", paymentMode);
    if (period !== "all") q.set("period", period);
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());

    adminGet<{
      data: ErpSupplierPaymentListRow[];
      total: number;
      modeTotals: SupplierPaymentModeTotals;
    }>(`erp/supplier-payments?${q.toString()}`)
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
        setModeTotals(res.modeTotals);
      })
      .finally(() => setLoading(false));
  }, [page, paymentMode, period, debouncedSearch, reloadToken]);

  const listParams: Record<string, string> = {};
  if (paymentMode !== "all") listParams.paymentMode = paymentMode;
  if (period !== "all") listParams.period = period;
  if (debouncedSearch.trim()) listParams.search = debouncedSearch.trim();

  const isFiltering =
    Boolean(debouncedSearch.trim()) || paymentMode !== "all" || period !== "all";

  if (loading && rows.length === 0) return <AdminPageSkeleton />;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Payment made"
        breadcrumb={[{ label: "Payment made", href: "/admin/erp/supplier-payments" }]}
        description="Individual supplier payments against purchase bills. Filter by payment mode or period."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Add new payment
          </Button>
        }
      />

      <AdminListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payment, vendor, bill, reference…"
        isEmpty={sorted.length === 0}
        emptyMessage="No supplier payments found."
        isFiltering={isFiltering}
        onClearFilters={() => {
          setSearch("");
          setPaymentMode("all");
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
          {
            id: "paymentMode",
            label: "Payment mode",
            value: paymentMode,
            options: PAYMENT_MODE_OPTIONS,
            onChange: setPaymentMode,
          },
        ]}
        footer={<AdminListFooter total={total} label="payments" page={page} pageSize={PAGE_SIZE} />}
      >
        <AdminDataTable>
          <AdminTableHeader>
            <SortableTableHead
              label="Date"
              sortKey="payment_date"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Payment #"
              sortKey="payment_number"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Payment made for"
              sortKey="payment_made_for"
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
              label="Reference #"
              sortKey="reference"
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
              label="Bill #"
              sortKey="bill_numbers"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHead
              label="Mode"
              sortKey="payment_mode"
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
            <TableHead className="w-28 text-right" />
          </AdminTableHeader>
          <AdminTableBody>
            {sorted.map((r) => (
              <AdminTableRow key={r.id}>
                <AdminTableCell>{r.payment_date}</AdminTableCell>
                <AdminTableCell>
                  <AdminTableLink
                    href={`/admin/erp/supplier-payments/${r.id}`}
                    title={r.payment_number}
                  >
                    {formatErpDocRef("PM", r.id)}
                  </AdminTableLink>
                </AdminTableCell>
                <AdminTableCell>{r.payment_made_for ?? "—"}</AdminTableCell>
                <AdminTableCell>
                  {r.store_id && r.store_name ? (
                    <AdminTableLink href={`/admin/erp/stores/${r.store_id}/edit`}>
                      {r.store_name}
                    </AdminTableLink>
                  ) : (
                    (r.store_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell>{r.reference ?? "—"}</AdminTableCell>
                <AdminTableCell>
                  {r.vendor_id && r.vendor_name ? (
                    <AdminTableLink href={`/admin/vendors/${r.vendor_id}/erp`}>
                      {r.vendor_name}
                    </AdminTableLink>
                  ) : (
                    (r.vendor_name ?? "—")
                  )}
                </AdminTableCell>
                <AdminTableCell>{r.bill_numbers ?? "—"}</AdminTableCell>
                <AdminTableCell>{r.payment_mode}</AdminTableCell>
                <AdminTableCell align="right" className="tabular-nums">
                  {formatCurrencyAmount(r.total_amount)}
                </AdminTableCell>
                <AdminTableCell align="right">
                  <ErpListRowActions viewHref={`/admin/erp/supplier-payments/${r.id}`} />
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminDataTable>
      </AdminListCard>

      {modeTotals ? (
        <Card className="overflow-hidden border border-border py-0 ring-0">
          <CardContent className="grid grid-cols-2 gap-2 p-3 text-sm sm:grid-cols-6">
            <div>
              <span className="text-muted-foreground">Cash</span>
              <br />
              {formatCurrencyAmount(modeTotals.Cash)}
            </div>
            <div>
              <span className="text-muted-foreground">Card</span>
              <br />
              {formatCurrencyAmount(modeTotals.Card)}
            </div>
            <div>
              <span className="text-muted-foreground">Cheque</span>
              <br />
              {formatCurrencyAmount(modeTotals.Cheque)}
            </div>
            <div>
              <span className="text-muted-foreground">Bank remittance</span>
              <br />
              {formatCurrencyAmount(modeTotals["Bank Remittance"])}
            </div>
            <div>
              <span className="text-muted-foreground">Bank transfer</span>
              <br />
              {formatCurrencyAmount(modeTotals["Bank Transfer"])}
            </div>
            <div>
              <span className="text-muted-foreground">Total</span>
              <br />
              <strong>{formatCurrencyAmount(modeTotals.total)}</strong>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Pagination
        total={total}
        page={page}
        basePath="/admin/erp/supplier-payments"
        listParams={listParams}
      />

      {isOpen ? (
        <SupplierPaymentFormView
          variant="modal"
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </AdminPageLayout>
  );
}
