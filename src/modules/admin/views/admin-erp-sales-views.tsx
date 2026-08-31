"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus } from "lucide-react";

import type {
  ErpCreditNoteListRow,
  ErpEstimateListRow,
  ErpPaymentListRow,
} from "@/common/erp/sales-types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SalesListCard,
  SalesLoadingState,
  SalesPageHeader,
  SalesPageLayout,
} from "@/modules/erp/components/sales-module-ui";
import { useErpFormModal } from "@/modules/admin/ui";
import { EstimateFormView } from "@/modules/admin/views/sales/estimate-form-view";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";

export function AdminErpEstimatesView() {
  const { activeStoreId } = useErpStores();
  const { isOpen, mode, editId, modalProps, openNew } = useErpFormModal("/admin/erp/estimates");
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<ErpEstimateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = new URLSearchParams({ page: "0" });
    if (activeStoreId) q.set("storeId", activeStoreId);
    adminGet<{ data: ErpEstimateListRow[] }>(`erp/estimates?${q.toString()}`)
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, [reloadToken, activeStoreId]);

  const filtered = search.trim()
    ? rows.filter(
        (r) =>
          r.estimate_number.toLowerCase().includes(search.toLowerCase()) ||
          formatErpDocRef("EST", r.id).toLowerCase().includes(search.toLowerCase()) ||
          (r.customer_name?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : rows;

  if (loading) return <SalesLoadingState />;

  return (
    <SalesPageLayout>
      <SalesPageHeader
        title="Estimates"
        description="Quotes and proposals for customers."
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus data-icon="inline-start" />
            Create estimate
          </Button>
        }
      />

      <SalesListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search estimate or customer…"
        isEmpty={filtered.length === 0}
        emptyMessage="No estimates found."
        isFiltering={Boolean(search.trim())}
        onClearFilters={() => setSearch("")}
        footer={<span>{filtered.length} estimates</span>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/erp/estimates/${row.id}`}
                    className="hover:text-primary hover:underline"
                    title={row.estimate_number}
                  >
                    {formatErpDocRef("EST", row.id)}
                  </Link>
                </TableCell>
                <TableCell>{row.customer_name ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {row.store_name ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrencyAmount(row.total_amount)}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.estimate_date}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button size="icon-sm" variant="ghost" aria-label="Estimate actions" />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem nativeButton={false} render={<Link href={`/admin/erp/estimates/${row.id}`} />}>
                          View estimate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          nativeButton={false}
                          render={<Link href={`/admin/erp/estimates?form=edit&id=${row.id}`} />}
                        >
                          Edit estimate
                        </DropdownMenuItem>
                        <DropdownMenuItem nativeButton={false} render={<Link href={`/admin/erp/estimates/${row.id}/print`} target="_blank" />}>
                          Print
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SalesListCard>

      {isOpen ? (
        <EstimateFormView
          variant="modal"
          mode={mode}
          estimateId={editId ?? undefined}
          open={modalProps.open}
          onOpenChange={modalProps.onOpenChange}
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
      ) : null}
    </SalesPageLayout>
  );
}

export function AdminErpPaymentsView() {
  const [rows, setRows] = useState<ErpPaymentListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminGet<{ data: ErpPaymentListRow[] }>("erp/payments?page=0")
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? rows.filter(
        (r) =>
          r.payment_number.toLowerCase().includes(search.toLowerCase()) ||
          formatErpDocRef("PR", r.id).toLowerCase().includes(search.toLowerCase()) ||
          (r.customer_name?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : rows;

  if (loading) return <SalesLoadingState />;

  return (
    <SalesPageLayout>
      <SalesPageHeader
        title="Payment received"
        description="Customer payments and allocations."
        actions={
          <Button size="sm" disabled>
            <Plus data-icon="inline-start" />
            Record payment
          </Button>
        }
      />

      <SalesListCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payment or customer…"
        isEmpty={filtered.length === 0}
        emptyMessage="No payments found."
        isFiltering={Boolean(search.trim())}
        onClearFilters={() => setSearch("")}
        footer={<span>{filtered.length} payments</span>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Store</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Bulk</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium" title={row.payment_number}>
                  {formatErpDocRef("PR", row.id)}
                </TableCell>
                <TableCell>{row.customer_name ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {row.store_name ?? "—"}
                </TableCell>
                <TableCell className="capitalize">{row.payment_mode}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrencyAmount(row.total_amount)}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.payment_date}</TableCell>
                <TableCell>{row.is_bulk ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button size="icon-sm" variant="ghost" aria-label="Payment actions" />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem disabled>View payment</DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SalesListCard>
    </SalesPageLayout>
  );
}

/** @deprecated Use CreditNotesListView */
export function AdminErpCreditNotesView() {
  const [rows, setRows] = useState<ErpCreditNoteListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet<{ data: ErpCreditNoteListRow[] }>("erp/credit-notes?page=0")
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SalesLoadingState />;

  return (
    <SalesPageLayout>
      <SalesPageHeader title="Credit notes" />
      <p className="text-sm text-muted-foreground">
        Use <Link href="/admin/erp/credit-notes" className="text-primary hover:underline">/admin/erp/credit-notes</Link> for the full list.
      </p>
      <p className="text-sm">{rows.length} credit notes loaded.</p>
    </SalesPageLayout>
  );
}
