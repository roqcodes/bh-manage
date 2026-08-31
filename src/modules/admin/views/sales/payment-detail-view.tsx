"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { paymentModeLabel } from "@/common/erp/sales-types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { AdminPageHeader, AdminPageLayout } from "@/modules/admin/ui";
import { ErpDocumentTabsLayout } from "@/modules/erp/components/erp-document-tabs-layout";
import { ErpDocumentActions } from "@/modules/erp/components/erp-document-actions";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesLoadingState } from "@/modules/erp/components/sales-module-ui";

type PaymentDetail = {
  id: string;
  payment_number: string;
  payment_date: string;
  payment_mode: string;
  total_amount: number;
  bank_charges: number;
  reference: string | null;
  notes: string | null;
  unallocated_amount: number;
  users: { name: string | null; email: string | null } | null;
  stores: { name: string } | null;
  accounts: { name: string } | null;
  bank_charges_account: { name: string } | null;
  erp_payment_allocations: Array<{
    amount: number;
    invoices: { invoice_number: string; total_amount: number; balance_due: number } | null;
  }>;
};

export function PaymentDetailView({ paymentId }: { paymentId: string }) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGet<PaymentDetail>(`erp/payments/${paymentId}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load payment"))
      .finally(() => setLoading(false));
  }, [paymentId]);

  if (loading) return <SalesLoadingState />;
  if (error || !detail) {
    return (
      <AdminPageLayout>
        <p className="text-sm text-rose-700">{error ?? "Payment not found."}</p>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={detail.payment_number}
        description={`${detail.payment_date} · ${paymentModeLabel(detail.payment_mode)}`}
        backHref="/admin/erp/payments"
        breadcrumb={[
          { label: "Payments", href: "/admin/erp/payments" },
          { label: detail.payment_number },
        ]}
        actions={
          <ErpDocumentActions
            layout="bar"
            showView={false}
            viewHref={`/admin/erp/payments/${paymentId}`}
            printHref={`/admin/erp/payments/${paymentId}/print`}
          />
        }
      />

      <ErpDocumentTabsLayout
        detailsLabel="Payment details"
        entityId={paymentId}
        auditEntityType="erp_payment"
        journalSourceType="customer_payment"
      >
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <CardTitle>Payment {detail.payment_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium">{detail.users?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Store</p>
                <p className="text-sm font-medium">{detail.stores?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment date</p>
                <p className="text-sm font-medium">{detail.payment_date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment type</p>
                <p className="text-sm font-medium">{paymentModeLabel(detail.payment_mode)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account</p>
                <p className="text-sm font-medium">{detail.accounts?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="text-sm font-medium">{detail.reference ?? "—"}</p>
              </div>
            </div>

            {detail.notes ? (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">{detail.notes}</p>
              </div>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Invoice balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.erp_payment_allocations.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.invoices?.invoice_number ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyAmount(row.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrencyAmount(row.invoices?.balance_due ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Paid amount</span>
              <span className="font-semibold tabular-nums">
                {formatCurrencyAmount(detail.total_amount)}
              </span>
            </div>
            {detail.bank_charges > 0 ? (
              <>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Bank charges</span>
                  <span className="tabular-nums">
                    {formatCurrencyAmount(detail.bank_charges)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Net deposit</span>
                  <span className="tabular-nums">
                    {formatCurrencyAmount(detail.total_amount - detail.bank_charges)}
                  </span>
                </div>
                {detail.bank_charges_account?.name ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Charges account</span>
                    <span className="text-right">{detail.bank_charges_account.name}</span>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Unallocated</span>
              <span className="tabular-nums">
                {formatCurrencyAmount(detail.unallocated_amount)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              render={<Link href="/admin/erp/payments" />}
            >
              Back to payments
            </Button>
          </CardContent>
        </Card>
      </div>
      </ErpDocumentTabsLayout>
    </AdminPageLayout>
  );
}
