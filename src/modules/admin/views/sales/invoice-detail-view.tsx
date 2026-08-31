"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { adminDelete, adminGet } from "@/modules/admin/lib/admin-api-client";
import { AdminPageHeader, AdminPageLayout } from "@/modules/admin/ui";
import { ErpDocumentTabsLayout } from "@/modules/erp/components/erp-document-tabs-layout";
import { ErpDocumentActions } from "@/modules/erp/components/erp-document-actions";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
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

type InvoiceDetail = {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  total_amount: number;
  amount_paid: number;
  credits_applied: number;
  balance_due: number;
  discount: number;
  gst_amount: number;
  due_date: string | null;
  created_at: string;
  notes: string | null;
  tax_inclusive: boolean;
  editable?: boolean;
  users: { name: string | null; email: string | null; company_name: string | null } | null;
  stores: { name: string } | null;
  invoice_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    gst_amount: number;
    total_amount: number;
    description: string | null;
  }>;
};

export function InvoiceDetailView({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  function reload() {
    return adminGet<InvoiceDetail>(`erp/invoices/${invoiceId}`).then(setDetail);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) {
    return (
      <AdminPageLayout>
        <p className="text-sm text-muted-foreground">Loading invoice…</p>
      </AdminPageLayout>
    );
  }

  if (!detail) {
    return (
      <AdminPageLayout>
        <p className="text-sm text-destructive">Invoice not found.</p>
      </AdminPageLayout>
    );
  }

  const canEdit = detail.editable ?? false;
  const canCancel = detail.status !== "cancelled" && canEdit;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={formatErpDocRef("INV", detail.id)}
        description={`${detail.created_at?.slice(0, 10) ?? ""} · ${detail.status}${detail.tax_inclusive ? " · Tax inclusive" : " · Tax exclusive"}`}
        backHref="/admin/erp/invoices"
        breadcrumb={[
          { label: "Invoices", href: "/admin/erp/invoices" },
          { label: formatErpDocRef("INV", detail.id) },
        ]}
        actions={
          <ErpDocumentActions
            layout="bar"
            showView={false}
            viewHref={`/admin/erp/invoices/${detail.id}`}
            editHref={`/admin/erp/invoices?form=edit&id=${detail.id}`}
            printHref={`/admin/erp/invoices/${detail.id}/print`}
            emailConfig={{
              documentType: "invoice",
              documentId: detail.id,
              documentNumber: detail.invoice_number,
              defaultEmail: detail.users?.email,
              amount: detail.total_amount,
              printUrl: `/admin/erp/invoices/${detail.id}/print`,
            }}
            canEdit={canEdit}
            canDelete={canCancel}
            deleteLabel="Cancel invoice"
            deleteDescription="Cancels the invoice and restores stock. Only allowed before payments or credit notes."
            onDelete={async () => {
              await adminDelete(`erp/invoices/${detail.id}`);
              router.push("/admin/erp/invoices");
            }}
          />
        }
      />

      <ErpDocumentTabsLayout
        detailsLabel="Invoice details"
        entityId={invoiceId}
        auditEntityType="invoice"
        journalSourceType="invoice"
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice #</p>
                  <p className="font-semibold">{detail.invoice_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice date</p>
                  <p className="font-semibold">{detail.created_at?.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due date</p>
                  <p className="font-semibold">{detail.due_date ?? "—"}</p>
                </div>
              </div>

              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Seller</p>
                  <p className="font-medium">{detail.stores?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Buyer</p>
                  <p className="font-medium">
                    {detail.users?.name ?? detail.users?.email ?? "—"}
                  </p>
                  {detail.users?.company_name ? (
                    <p className="text-muted-foreground">{detail.users.company_name}</p>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Tax amount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.invoice_items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium">{item.product_name}</p>
                          {item.description ? (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyAmount(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.gst_rate}%</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyAmount(item.gst_amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrencyAmount(item.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end gap-1 border-t pt-3 text-sm">
                <p>
                  Sub total:{" "}
                  <span className="font-medium tabular-nums">
                    {formatCurrencyAmount(detail.subtotal)}
                  </span>
                </p>
                <p>
                  Tax:{" "}
                  <span className="font-medium tabular-nums">
                    {formatCurrencyAmount(detail.gst_amount)}
                  </span>
                </p>
                {detail.discount > 0 ? (
                  <p>
                    Discount:{" "}
                    <span className="font-medium tabular-nums">
                      {formatCurrencyAmount(detail.discount)}
                    </span>
                  </p>
                ) : null}
                <p className="text-base font-semibold">
                  Total:{" "}
                  <span className="tabular-nums">{formatCurrencyAmount(detail.total_amount)}</span>
                </p>
                <p>
                  Amount paid:{" "}
                  <span className="font-medium tabular-nums">
                    {formatCurrencyAmount(detail.amount_paid)}
                  </span>
                </p>
                {detail.credits_applied > 0 ? (
                  <p>
                    Credits applied:{" "}
                    <span className="font-medium tabular-nums">
                      {formatCurrencyAmount(detail.credits_applied)}
                    </span>
                  </p>
                ) : null}
                <p className="font-semibold text-destructive">
                  Balance due:{" "}
                  <span className="tabular-nums">{formatCurrencyAmount(detail.balance_due)}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground">Credits applied</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrencyAmount(detail.credits_applied)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrencyAmount(detail.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance due</p>
                <p className="font-semibold tabular-nums text-destructive">
                  {formatCurrencyAmount(detail.balance_due)}
                </p>
              </div>
              <div className="sm:col-span-3">
                <Button
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  disabled={detail.status === "cancelled" || detail.balance_due <= 0}
                  render={
                    <Link
                      href={`/admin/erp/payments/new?invoiceId=${encodeURIComponent(detail.id)}`}
                    />
                  }
                >
                  Add payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErpDocumentTabsLayout>
    </AdminPageLayout>
  );
}
