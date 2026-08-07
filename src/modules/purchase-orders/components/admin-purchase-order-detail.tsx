"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2,
  ChevronDown,
  Download,
  ExternalLink,
  Package,
  Phone,
  Printer,
  RotateCcw,
  Truck,
} from "lucide-react";

import type { AdminPurchaseOrderDetail } from "@/common/admin/types";
import { cancelAdminPurchaseOrderAction } from "@/modules/purchase-orders/actions/admin-purchase-orders.actions";
import { AdminBreadcrumb } from "@/modules/admin/components/admin-breadcrumb";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import {
  formatInr,
  PO_ACCENT,
  PoStatusPill,
  shortPoRef,
} from "@/modules/purchase-orders/components/purchase-orders-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const PO_FLOW = ["pending", "accepted", "delivered"] as const;

function TimelineAvatar({ label }: { label: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {label}
    </span>
  );
}

function formatMoney(n: number | null) {
  if (n == null) return "—";
  return formatInr(n);
}

function lineTotal(qty: number | null, price: number | null) {
  if (qty == null || price == null) return 0;
  return qty * price;
}

function buildTimeline(po: AdminPurchaseOrderDetail) {
  const status = po.status ?? "pending";
  const events: {
    id: string;
    title: string;
    detail: string;
    at: string | null;
    icon: string;
  }[] = [
    {
      id: "created",
      title: "PO created",
      detail: `Purchase order #${shortPoRef(po.id)} was created from procurement.`,
      at: po.created_at,
      icon: "PO",
    },
  ];

  if (status === "cancelled") {
    events.push({
      id: "cancelled",
      title: "PO cancelled",
      detail: "This purchase order was cancelled before vendor acceptance.",
      at: po.created_at,
      icon: "×",
    });
    return events;
  }

  const flowIndex = PO_FLOW.indexOf(status as (typeof PO_FLOW)[number]);

  if (flowIndex >= 1 || status === "accepted") {
    events.push({
      id: "accepted",
      title: "Vendor accepted",
      detail: "Vendor committed to fulfil this purchase order.",
      at: po.created_at,
      icon: "✓",
    });
  }

  if (flowIndex >= 2 || status === "delivered") {
    events.push({
      id: "delivered",
      title: "Goods delivered",
      detail: "Vendor marked this PO as delivered. Stock should be received.",
      at: po.created_at,
      icon: "★",
    });
  } else if (status === "pending") {
    events.push({
      id: "awaiting",
      title: "Awaiting vendor",
      detail: "Vendor can accept or reject from their portal.",
      at: po.created_at,
      icon: "…",
    });
  }

  return events;
}

function vendorInitials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function PurchaseOrderDetailPanel({
  po,
}: {
  po: AdminPurchaseOrderDetail;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const status = po.status ?? "";
  const items = po.purchase_order_items ?? [];
  const vendor = po.vendors;
  const vendorId = po.vendor_id;
  const cancelled = status === "cancelled";
  const canCancel = status === "pending";

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, line) => sum + lineTotal(line.quantity, line.price),
        0,
      ),
    [items],
  );
  const total = Number(po.total_amount ?? subtotal);

  const timeline = useMemo(() => buildTimeline(po), [po]);

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.purchaseOrderDetail(po.id),
    });
    await queryClient.invalidateQueries({
      queryKey: ["admin", "purchase-orders"],
    });
  }

  function handleCancel() {
    if (
      !confirm(
        `Cancel purchase order #${shortPoRef(po.id)}? This can only be done while pending.`,
      )
    ) {
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const res = await cancelAdminPurchaseOrderAction(po.id);
      if (!res.ok) {
        setActionError(res.message ?? "Could not cancel.");
        return;
      }
      await invalidate();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminBreadcrumb
        items={[
          { label: "Purchase orders", href: "/admin/purchase-orders" },
          { label: `#${shortPoRef(po.id)}` },
        ]}
        backHref="/admin/purchase-orders"
      />

      {actionError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            #{shortPoRef(po.id)}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <PoStatusPill status={po.status} />
            <span className="text-sm text-muted-foreground">
              {po.created_at
                ? format(new Date(po.created_at), "MMM d, yyyy · h:mm a")
                : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCancel ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleCancel}
            >
              <RotateCcw data-icon="inline-start" />
              Cancel PO
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={isPending} />
              }
            >
              More actions
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      href={`/admin/purchase-orders/${po.id}/invoice`}
                      target="_blank"
                    />
                  }
                >
                  <Printer />
                  Print invoice
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      href={`/admin/purchase-orders/${po.id}/invoice?download=1`}
                      target="_blank"
                    />
                  }
                >
                  <Download />
                  Download invoice (PDF)
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="border border-border ring-0">
            <CardHeader className="border-b">
              <CardTitle>Line items</CardTitle>
              <CardDescription>
                {cancelled
                  ? "This purchase order was cancelled."
                  : `${items.length} item${items.length === 1 ? "" : "s"} · Status: ${status}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No line items.</p>
              ) : (
                items.map((line) => {
                  const pv = line.product_variants;
                  const productName = pv?.products?.name ?? "Item";
                  const variantName = pv?.name ?? "—";
                  const unit = Number(line.price ?? 0);
                  const qty = Number(line.quantity ?? 1);
                  const lineAmt = lineTotal(line.quantity, line.price);

                  return (
                    <div
                      key={line.id}
                      className="flex items-start gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                        <Package />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {variantName} · Qty {qty} · {formatMoney(unit)} each
                        </p>
                        {line.variant_id ? (
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {line.variant_id.slice(0, 8).toUpperCase()}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(lineAmt)}
                      </p>
                    </div>
                  );
                })
              )}
              {!cancelled && status === "accepted" ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <p className="text-sm text-muted-foreground">
                    <Truck className="mr-1 inline" />
                    Vendor has accepted — awaiting delivery
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border border-border ring-0">
            <CardHeader className="border-b">
              <CardTitle>PO summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>PO total</span>
                <span className="tabular-nums">{formatMoney(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Status</span>
                <span className="capitalize">{status || "—"}</span>
              </div>
              {cancelled ? (
                <div className="flex justify-between font-medium text-muted-foreground">
                  <span>Outcome</span>
                  <span>Cancelled before fulfilment</span>
                </div>
              ) : status === "delivered" ? (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Received</span>
                  <span className="tabular-nums">{formatMoney(total)}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border border-border ring-0">
            <CardHeader className="border-b">
              <CardTitle>Timeline</CardTitle>
              <CardDescription>PO milestones</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ol className="flex flex-col gap-4">
                {timeline.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <TimelineAvatar label={event.icon} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.detail}
                      </p>
                      {event.at ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(event.at), "MMM d, yyyy · h:mm a")}
                          {" · "}
                          {formatDistanceToNow(new Date(event.at), {
                            addSuffix: true,
                          })}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="border border-border ring-0">
            <CardHeader className="border-b pb-4">
              <CardTitle>Vendor</CardTitle>
              <CardDescription>
                Supplier fulfilling this purchase order
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {vendorInitials(vendor?.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-tight">
                    {vendor?.name?.trim() || "Unknown vendor"}
                  </p>
                  {vendorId ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {vendorId.slice(0, 8).toUpperCase()}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3.5 text-sm">
                {vendor?.contact ? (
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Contact
                      </p>
                      <p className="font-medium">{vendor.contact}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No contact details on file.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-dashed bg-muted/20 p-3.5 text-sm text-muted-foreground">
                Vendors accept and fulfil POs from their portal. You can cancel
                only while the PO is still pending.
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-4">
                {vendorId ? (
                  <Link
                    href={`/admin/vendors/${vendorId}`}
                    className={buttonVariants({
                      size: "sm",
                      variant: "default",
                      className: "gap-1.5",
                    })}
                  >
                    <Building2 data-icon="inline-start" />
                    View vendor
                  </Link>
                ) : null}
                <Link
                  href={`/admin/purchase-orders/${po.id}/invoice`}
                  target="_blank"
                  className={buttonVariants({
                    size: "sm",
                    variant: "outline",
                    className: "gap-1.5",
                  })}
                >
                  <Printer data-icon="inline-start" />
                  Print invoice
                  <ExternalLink className="size-3.5 opacity-70" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use PurchaseOrderDetailPanel */
export const AdminPurchaseOrderDetailView = PurchaseOrderDetailPanel;
