"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import { formatAuditLogUserDetail } from "@/modules/erp/lib/audit-log-display";
import type { AuditLogEntry } from "@/common/erp/types";
import type { ErpPurchaseOrderDetail } from "@/common/erp/purchasing-types";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { cancelAdminPurchaseOrderAction } from "@/modules/purchase-orders/actions/admin-purchase-orders.actions";
import { AdminBreadcrumb } from "@/modules/admin/components/admin-breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { formatErpDocRef } from "@/lib/erp-document-ref";
import { PoStatusPill } from "@/modules/purchase-orders/components/purchase-orders-ui";

export function PurchaseOrderDetailErpView({ poId }: { poId: string }) {
  const [pending, startTransition] = useTransition();
  const [po, setPo] = useState<ErpPurchaseOrderDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGet<{ po: ErpPurchaseOrderDetail; auditLogs: AuditLogEntry[] }>(
      `erp/purchase-orders/${poId}`,
    ).then((res) => {
      setPo(res.po);
      setAuditLogs(res.auditLogs ?? []);
    });
  }, [poId]);

  if (!po) return <p className="p-4 text-sm">Loading purchase order…</p>;

  const canEdit = po.status === "pending";
  const canCancel = po.status === "pending";
  const activeBill =
    po.linked_bill && po.linked_bill.status !== "cancelled" ? po.linked_bill : null;
  const cancelledBill =
    po.linked_bill?.status === "cancelled" ? po.linked_bill : null;
  const canConvert =
    !activeBill &&
    po.status !== "cancelled" &&
    po.purchase_order_items.length > 0;

  function handleCancel() {
    if (!confirm("Cancel this purchase order?")) return;
    startTransition(async () => {
      const res = await cancelAdminPurchaseOrderAction(poId);
      if (!res.ok) {
        setError(res.message ?? "Cancel failed");
        return;
      }
      const refreshed = await adminGet<{ po: ErpPurchaseOrderDetail; auditLogs: AuditLogEntry[] }>(
        `erp/purchase-orders/${poId}`,
      );
      setPo(refreshed.po);
      setAuditLogs(refreshed.auditLogs ?? []);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <AdminBreadcrumb
        items={[
          { label: "Purchase orders", href: "/admin/purchase-orders" },
          { label: formatErpDocRef("PO", poId) },
        ]}
        backHref="/admin/purchase-orders"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold" title={po.po_number ?? undefined}>
            {formatErpDocRef("PO", poId)}
          </h1>
          <PoStatusPill status={po.status ?? "pending"} />
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/admin/purchase-orders?form=edit&id=${poId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Edit
            </Link>
          ) : null}
          {canConvert ? (
            <Link
              href={`/admin/erp/purchase-bills?form=new&poId=${poId}`}
              className={buttonVariants()}
            >
              {cancelledBill ? "Re-issue bill" : "Convert to bill"}
            </Link>
          ) : null}
          {activeBill ? (
            <Link
              href={`/admin/erp/purchase-bills/${activeBill.id}`}
              className={buttonVariants({ variant: "outline" })}
              title={activeBill.purchase_bill_number}
            >
              Bill {formatErpDocRef("PB", activeBill.id)}
            </Link>
          ) : null}
          {cancelledBill && !activeBill ? (
            <Link
              href={`/admin/erp/purchase-bills/${cancelledBill.id}`}
              className={buttonVariants({ variant: "outline" })}
              title={cancelledBill.purchase_bill_number}
            >
              View cancelled bill
            </Link>
          ) : null}
          {canCancel ? (
            <Button variant="destructive" disabled={pending} onClick={handleCancel}>
              Cancel PO
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor & delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-500">Vendor:</span> {po.vendors?.name ?? "—"}</p>
            <p><span className="text-slate-500">Store:</span> {po.stores?.name ?? "—"}</p>
            <p><span className="text-slate-500">PO date:</span> {po.po_date ?? "—"}</p>
            <p><span className="text-slate-500">Expected delivery:</span> {po.expected_delivery_date ?? "—"}</p>
            <p><span className="text-slate-500">Reference:</span> {po.reference ?? "—"}</p>
            {po.vendors?.phone ? <p><span className="text-slate-500">Phone:</span> {po.vendors.phone}</p> : null}
            {po.vendors?.address ? <p><span className="text-slate-500">Address:</span> {po.vendors.address}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Subtotal: {formatCurrencyAmount(po.subtotal)}</p>
            <p>Tax: {formatCurrencyAmount(po.tax_total)}</p>
            <p>Discount: {formatCurrencyAmount(po.discount)}</p>
            <p className="font-semibold">Total: {formatCurrencyAmount(po.total_amount ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="pb-2">Product</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Rate</th>
                <th className="pb-2">Tax %</th>
                <th className="pb-2">Tax</th>
                <th className="pb-2">Line total</th>
              </tr>
            </thead>
            <tbody>
              {po.purchase_order_items.map((line) => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="py-2">
                    {line.product_variants?.products?.name ?? "Item"}
                    {line.product_variants?.name ? ` — ${line.product_variants.name}` : ""}
                  </td>
                  <td className="py-2">{line.quantity}</td>
                  <td className="py-2">{formatCurrencyAmount(line.price)}</td>
                  <td className="py-2">{line.tax_rate_percent}%</td>
                  <td className="py-2">{formatCurrencyAmount(line.tax_amount)}</td>
                  <td className="py-2">{formatCurrencyAmount(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {auditLogs.map((log) => (
              <p key={log.id}>
                <span className="text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                {" — "}
                <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
                {" by "}
                {formatAuditLogUserDetail(log)}
                {log.description ? `: ${log.description}` : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
