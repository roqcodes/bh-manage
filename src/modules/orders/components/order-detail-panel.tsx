"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Printer,
  RotateCcw,
  Truck,
  User,
} from "lucide-react";

import type { OrderStatus, OrderWithItems } from "@/common/admin/types";
import { currencyLabel, getCurrencySymbol } from "@/lib/format-currency";
import {
  cancelOrderAndRefundAction,
  updateOrderDetailsAction,
  updateOrderStatusAction,
} from "@/modules/orders/actions/orders.actions";
import { AdminBreadcrumb } from "@/modules/admin/components/admin-breadcrumb";
import { OrderEditModal } from "@/modules/orders/components/order-edit-modal";
import { OrderFulfillmentPanel } from "@/modules/orders/components/order-fulfillment-panel";
import { OrderLineItemsList } from "@/modules/orders/components/order-line-items-list";
import { AddressMapEmbed } from "@/modules/admin/components/address-map-embed";
import { textareaCls } from "@/modules/admin/components/modal";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import { adminPost } from "@/modules/admin/lib/admin-api-client";
import {
  customerInitials,
  CustomerEditedPill,
  formatAddressLine,
  formatInr,
  fulfillmentActionLabel,
  FulfillmentPill,
  getNextFulfillmentStatus,
  InventoryFulfillmentStatusPill,
  isCancelled,
  isCustomerEditedOrder,
  isPaid,
  isPaymentNotRequired,
  isRefunded,
  ORDER_FULFILLMENT_FLOW,
  PaymentPill,
  shortOrderRef,
} from "@/modules/orders/components/orders-ui";
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
import { computeOrderPaymentSummary } from "@/modules/orders/lib/order-payment-summary";
import { Separator } from "@/components/ui/separator";

function TimelineAvatar({ label }: { label: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {label}
    </span>
  );
}

function buildTimeline(order: OrderWithItems, total: number) {
  const events: {
    id: string;
    title: string;
    detail: string;
    at: string | null;
    icon: string;
  }[] = [
    {
      id: "created",
      title: "Order placed",
      detail: `Order #${shortOrderRef(order.id)} was created.`,
      at: order.created_at,
      icon: "BH",
    },
  ];

  if (order.merchant_note?.trim()) {
    events.splice(1, 0, {
      id: "merchant-note",
      title: "Note for merchant",
      detail: order.merchant_note.trim(),
      at: order.created_at,
      icon: "✎",
    });
  }

  if (isRefunded(order.payment_status)) {
    events.push({
      id: "refunded",
      title: "Cancelled & refunded",
      detail: `${formatInr(total)} returned to customer wallet.`,
      at: order.created_at,
      icon: "↩",
    });
  } else if (isPaid(order.payment_status)) {
    events.push({
      id: "payment",
      title: "Payment captured",
      detail: `${formatInr(total)} paid via BuyHub wallet.`,
      at: order.created_at,
      icon: getCurrencySymbol(),
    });
  } else if (isPaymentNotRequired(order.payment_status)) {
    events.push({
      id: "payment-not-required",
      title: "No payment required",
      detail: "Order placed without wallet payment.",
      at: order.created_at,
      icon: "—",
    });
  } else if (!isCancelled(order.status)) {
    events.push({
      id: "payment-pending",
      title: "Payment pending",
      detail: "Awaiting wallet payment from customer.",
      at: order.created_at,
      icon: "…",
    });
  }

  const statusIndex = ORDER_FULFILLMENT_FLOW.indexOf(
    order.status as OrderStatus,
  );

  if (statusIndex >= 1) {
    events.push({
      id: "processing",
      title: "Order confirmed",
      detail: "Items are being packed for shipment.",
      at: order.created_at,
      icon: "✓",
    });
  }
  if (statusIndex >= 2) {
    events.push({
      id: "shipped",
      title: "Order shipped",
      detail: "Package handed off for delivery.",
      at: order.created_at,
      icon: "🚚",
    });
  }
  if (statusIndex >= 3) {
    events.push({
      id: "delivered",
      title: "Order delivered",
      detail: "Fulfillment completed.",
      at: order.created_at,
      icon: "★",
    });
  }

  if (isCancelled(order.status) && !isRefunded(order.payment_status)) {
    events.push({
      id: "cancelled",
      title: "Order cancelled",
      detail: "This order was cancelled.",
      at: order.created_at,
      icon: "×",
    });
  }

  return events;
}

function MerchantNoteSection({
  orderId,
  note,
  onSaved,
}: {
  orderId: string;
  note: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const trimmed = note?.trim() ?? "";

  function startEdit() {
    setDraft(note ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(note ?? "");
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateOrderDetailsAction(orderId, {
          merchantNote: draft.trim() || null,
        });
        onSaved();
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save note.");
      }
    });
  }

  return (
    <Card className="border border-border ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            Note for merchant
          </CardTitle>
        </div>
        {!editing ? (
          <Button type="button" variant="outline" size="sm" onClick={startEdit}>
            <Pencil data-icon="inline-start" />
            {trimmed ? "Edit" : "Add note"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="pt-4">
        {editing ? (
          <div className="flex flex-col gap-3">
            <textarea
              className={textareaCls}
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Delivery instructions, preferences, etc."
              maxLength={500}
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              {draft.length}/500 characters
            </p>
            {error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelEdit}  
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save note"}
              </Button>
            </div>
          </div>
        ) : trimmed ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {trimmed}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No note from the customer. Add delivery instructions or internal
            notes for your team.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ExpectedDeliverySection({
  orderId,
  preferredDate,
  expectedDate,
  onSaved,
}: {
  orderId: string;
  preferredDate: string | null | undefined;
  expectedDate: string | null | undefined;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(expectedDate ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const preferredLabel = preferredDate
    ? format(new Date(`${preferredDate}T12:00:00`), "EEE, d MMM yyyy")
    : null;
  const expectedLabel = expectedDate
    ? format(new Date(`${expectedDate}T12:00:00`), "EEE, d MMM yyyy")
    : null;

  function startEdit() {
    setDraft(expectedDate ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(expectedDate ?? "");
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    const trimmed = draft.trim();
    startTransition(async () => {
      try {
        await updateOrderDetailsAction(orderId, {
          shipmentDate: trimmed || null,
        });
        onSaved();
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save delivery date.");
      }
    });
  }

  return (
    <Card className="border border-border ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-4" />
            Delivery dates
          </CardTitle>
          <CardDescription>
            Customer preference and your promised delivery date
          </CardDescription>
        </div>
        {!editing ? (
          <Button type="button" variant="outline" size="sm" onClick={startEdit}>
            <Pencil data-icon="inline-start" />
            {expectedLabel ? "Edit expected" : "Set expected"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Customer preferred
          </p>
          <p className="mt-1 font-medium">
            {preferredLabel ?? "No preference at checkout"}
          </p>
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium" htmlFor="expected-delivery-date">
              Expected delivery
            </label>
            <input
              id="expected-delivery-date"
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isPending}
            />
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={isPending}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-background p-3 text-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Expected delivery
            </p>
            <p className="mt-1 font-medium">
              {expectedLabel ?? "Not set — customer sees a pending message in the app"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderDetailPanel({ order }: { order: OrderWithItems }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const cancelled = isCancelled(order.status);
  const paid = isPaid(order.payment_status);
  const refunded = isRefunded(order.payment_status);
  const paymentNotRequired = isPaymentNotRequired(order.payment_status);
  const nextStatus = getNextFulfillmentStatus(order.status);
  const nextActionLabel = fulfillmentActionLabel(order.status);
  const needsStoreAssignment =
    order.fulfillment_status === "pending_assignment";
  const canAdvanceFulfillment =
    nextStatus && !(nextStatus === "shipped" && needsStoreAssignment);

  const paymentSummary = useMemo(
    () => computeOrderPaymentSummary(order),
    [order],
  );
  const total = paymentSummary.grandTotal;

  const addressText = order.addresses
    ? formatAddressLine(order.addresses)
    : null;

  const mapHref =
    order.addresses?.latitude != null && order.addresses?.longitude != null
      ? `https://www.google.com/maps?q=${order.addresses.latitude},${order.addresses.longitude}`
      : addressText
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`
        : null;

  const timeline = useMemo(
    () => buildTimeline(order, total),
    [order, total],
  );
  const isSalesOrder = order.source === "sales_order";

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.orderDetail(order.id),
    });
    await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
  }

  function handleStatusChange(status: string) {
    setActionError(null);
    startTransition(async () => {
      try {
        await updateOrderStatusAction(order.id, status);
        await invalidate();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Update failed.");
      }
    });
  }

  function handleCancelAndRefund() {
    const confirmMessage = paid
      ? `Cancel order #${shortOrderRef(order.id)} and refund ${formatInr(total)} to the customer wallet? Stock will be restored.`
      : `Cancel order #${shortOrderRef(order.id)}? Stock will be restored. No wallet refund applies to this order.`;

    if (!confirm(confirmMessage)) {
      return;
    }
    setActionError(null);
    startTransition(async () => {
      try {
        await cancelOrderAndRefundAction(order.id);
        await invalidate();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Cancel failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {showEdit ? (
        <OrderEditModal
          order={order}
          onClose={() => setShowEdit(false)}
          onSaved={() => void invalidate()}
        />
      ) : null}

      <AdminBreadcrumb
        items={[
          { label: "Orders", href: "/admin/orders" },
          { label: `#${shortOrderRef(order.id)}` },
        ]}
        backHref="/admin/orders"
      />

      {actionError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError}
        </p>
      ) : null}

      {isCustomerEditedOrder(order.customer_edited_at) ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <p className="font-semibold">Customer edited this order</p>
          <p className="mt-1 text-violet-800/90">
            Fulfillment was reset to pending. Review new or changed line items (tagged below), then confirm the order again.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            #{shortOrderRef(order.id)}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <PaymentPill paymentStatus={order.payment_status} />
            <FulfillmentPill status={order.status} />
            <InventoryFulfillmentStatusPill status={order.fulfillment_status} />
            {isCustomerEditedOrder(order.customer_edited_at) ? (
              <CustomerEditedPill />
            ) : null}
            <span className="text-sm text-muted-foreground">
              {order.created_at
                ? format(new Date(order.created_at), "MMM d, yyyy · h:mm a")
                : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSalesOrder && !cancelled ? (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                setActionError(null);
                startTransition(async () => {
                  try {
                    const res = await adminPost<{ invoiceId: string }>(
                      `erp/sales-orders/${order.id}/convert-to-invoice`,
                      {},
                    );
                    router.push(`/admin/erp/invoices/${res.invoiceId}`);
                  } catch (err) {
                    setActionError(
                      err instanceof Error ? err.message : "Conversion failed",
                    );
                  }
                });
              }}
            >
              Create invoice
            </Button>
          ) : null}
          {!cancelled ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleCancelAndRefund}
            >
              <RotateCcw data-icon="inline-start" />
              {paid ? "Cancel & refund" : "Cancel order"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || cancelled}
            onClick={() => setShowEdit(true)}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
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
                      href={`/admin/orders/${order.id}/invoice`}
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
                      href={`/admin/orders/${order.id}/invoice?download=1`}
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
          {canAdvanceFulfillment && nextActionLabel ? (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleStatusChange(nextStatus!)}
            >
              {nextActionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <OrderFulfillmentPanel
            order={order}
            onUpdated={invalidate}
          />

          <Card className="border border-border ring-0">
            <CardHeader className="border-b">
              <CardTitle>Line items</CardTitle>
              <CardDescription>
                {cancelled
                  ? "This order was cancelled."
                  : `Order status: ${order.status}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4">
              <OrderLineItemsList order={order} />
              {!cancelled && canAdvanceFulfillment && nextStatus ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <p className="text-sm text-muted-foreground">
                    <Truck className="mr-1 inline" />
                    Next step: {nextActionLabel?.toLowerCase()}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleStatusChange(nextStatus)}
                  >
                    {nextActionLabel}
                  </Button>
                </div>
              ) : needsStoreAssignment ? (
                <p className="border-t pt-3 text-sm text-amber-800">
                  Assign a fulfilling store above before marking this order as
                  shipped.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border border-border ring-0">
            <CardHeader className="border-b">
              <CardTitle>Payment summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{currencyLabel("Subtotal")}</span>
                <span className="tabular-nums">
                  {formatInr(paymentSummary.catalogSubtotal ?? paymentSummary.itemTotal)}
                </span>
              </div>
              {paymentSummary.totalDiscount > 0 ? (
                <>
                  {paymentSummary.lineDiscount > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Line discounts</span>
                      <span className="tabular-nums text-emerald-700">
                        −{formatInr(paymentSummary.lineDiscount)}
                      </span>
                    </div>
                  ) : null}
                  {paymentSummary.orderDiscount > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Extra order discount</span>
                      <span className="tabular-nums text-emerald-700">
                        −{formatInr(paymentSummary.orderDiscount)}
                      </span>
                    </div>
                  ) : null}
                  {paymentSummary.lineDiscount <= 0 && paymentSummary.orderDiscount <= 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total discount</span>
                      <span className="tabular-nums text-emerald-700">
                        −{formatInr(paymentSummary.totalDiscount)}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
              {paymentSummary.tax > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatInr(paymentSummary.tax)}</span>
                </div>
              ) : null}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{currencyLabel("Order total")}</span>
                <span className="tabular-nums">{formatInr(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Payment status</span>
                <span>
                  {paymentNotRequired
                    ? "No payment required"
                    : (order.payment_status ?? "pending")}
                </span>
              </div>
              {refunded ? (
                <div className="flex justify-between font-medium text-rose-700">
                  <span>{currencyLabel("Refunded to wallet")}</span>
                  <span className="tabular-nums">−{formatInr(total)}</span>
                </div>
              ) : paid ? (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>{currencyLabel("Paid via wallet")}</span>
                  <span className="tabular-nums">{formatInr(total)}</span>
                </div>
              ) : paymentNotRequired ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment method</span>
                  <span>Not captured</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border border-border ring-0">
            <CardHeader className="border-b">
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Order milestones</CardDescription>
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
          <MerchantNoteSection
            orderId={order.id}
            note={order.merchant_note}
            onSaved={() => void invalidate()}
          />

          <ExpectedDeliverySection
            orderId={order.id}
            preferredDate={order.preferred_delivery_date}
            expectedDate={order.shipment_date}
            onSaved={() => void invalidate()}
          />

          <Card className="border border-border ring-0">
            <CardHeader className="border-b pb-4">
              <CardTitle>Customer</CardTitle>
              <CardDescription>
                Contact details and delivery information
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {customerInitials(order.users?.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-tight">
                    {order.users?.name ?? "Guest"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.customer_order_count} order
                    {order.customer_order_count === 1 ? "" : "s"} with BuyHub
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3.5 text-sm">
                {order.users?.email ? (
                  <div className="flex items-start gap-2.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Email
                      </p>
                      <a
                        href={`mailto:${order.users.email}`}
                        className="break-all font-medium hover:underline"
                      >
                        {order.users.email}
                      </a>
                    </div>
                  </div>
                ) : null}
                {order.users?.phone ? (
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Phone
                      </p>
                      <a
                        href={`tel:${order.users.phone}`}
                        className="font-medium hover:underline"
                      >
                        {order.users.phone}
                      </a>
                    </div>
                  </div>
                ) : null}
                {!order.users?.email && !order.users?.phone ? (
                  <p className="text-muted-foreground">
                    No contact details on file.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Delivery store</p>
                </div>
                {addressText ? (
                  <div className="rounded-lg border bg-background p-3.5">
                    {order.addresses?.label ? (
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {order.addresses.label}
                      </p>
                    ) : null}
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {addressText}
                    </p>
                    {order.addresses?.phone ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Phone: {order.addresses.phone}
                      </p>
                    ) : null}
                    {order.addresses?.latitude != null &&
                    order.addresses?.longitude != null ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Pin {Number(order.addresses.latitude).toFixed(6)},{' '}
                          {Number(order.addresses.longitude).toFixed(6)}
                        </p>
                        <AddressMapEmbed
                          latitude={Number(order.addresses.latitude)}
                          longitude={Number(order.addresses.longitude)}
                          label={order.addresses.label ?? "Delivery"}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed bg-muted/20 p-3.5 text-sm text-muted-foreground">
                    No delivery store saved for this order.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-4">
                {order.users?.id ? (
                  <Link
                    href={`/admin/customers/${order.users.id}`}
                    className={buttonVariants({
                      size: "sm",
                      variant: "default",
                      className: "gap-1.5",
                    })}
                  >
                    <User data-icon="inline-start" />
                    View customer
                  </Link>
                ) : null}
                {mapHref ? (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      size: "sm",
                      variant: "outline",
                      className: "gap-1.5",
                    })}
                  >
                    <MapPin data-icon="inline-start" />
                    Open in maps
                    <ExternalLink className="size-3.5 opacity-70" />
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
