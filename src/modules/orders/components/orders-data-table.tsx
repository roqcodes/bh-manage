"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Columns3,
  Download,
  MapPin,
  MoreHorizontal,
  Package,
  Printer,
  Truck,
  X,
} from "lucide-react";

import type { Order } from "@/common/admin/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  bulkUpdateOrderStatusAction,
} from "@/modules/orders/actions/orders.actions";
import {
  formatInr,
  FulfillmentPill,
  ORDERS_ACCENT,
  PaymentPill,
  shortOrderRef,
  isPaid,
} from "@/modules/orders/components/orders-ui";

function exportOrdersCsv(orders: Order[]) {
  const headers = [
    "Order ID",
    "Customer",
    "Email",
    "Date",
    "Payment Status",
    "Fulfillment Status",
    "Items",
    "Total (INR)",
  ];

  const rows = orders.map((order) => [
    shortOrderRef(order.id),
    order.users?.name ?? "Guest",
    order.users?.email ?? "",
    order.created_at
      ? format(new Date(order.created_at), "yyyy-MM-dd HH:mm")
      : "",
    isPaid(order.payment_status) ? "Paid" : "Unpaid",
    order.status,
    String(order.item_count),
    String(Number(order.total_amount ?? 0)),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printShippingLabels(orderIds: string[]) {
  for (const id of orderIds) {
    window.open(`/admin/orders/${id}/invoice`, "_blank", "noopener,noreferrer");
  }
}

function CustomerPopover({ order }: { order: Order }) {
  const name = order.users?.name ?? "Guest";
  const userId = order.users?.id;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 text-[13px] font-medium leading-snug text-foreground hover:text-primary hover:underline",
              ORDERS_ACCENT.focus,
            )}
          />
        }
      >
        {name}
        <ChevronDown />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <PopoverHeader>
          <PopoverTitle>{name}</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-2 text-sm">
          {order.users?.email ? (
            <p className="text-muted-foreground">{order.users.email}</p>
          ) : null}
          {order.users?.phone ? (
            <p className="text-muted-foreground">{order.users.phone}</p>
          ) : null}
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin />
            India
          </p>
          <p className="text-muted-foreground">
            {order.customer_order_count.toLocaleString("en-IN")} order
            {order.customer_order_count === 1 ? "" : "s"} with BuyHub
          </p>
          {userId ? (
            <Link
              href={`/admin/customers/${userId}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              View customer
            </Link>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ItemsPopover({ order }: { order: Order }) {
  const count = order.item_count;
  const label = `${count} item${count === 1 ? "" : "s"}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground",
              ORDERS_ACCENT.focus,
            )}
          />
        }
      >
        {label}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          {order.order_items_preview.length === 0 ? (
            <DropdownMenuItem disabled>No items</DropdownMenuItem>
          ) : (
            order.order_items_preview.map((item) => (
              <DropdownMenuItem key={item.id} disabled>
                <span className="truncate">
                  {item.quantity ?? 1}× {item.product_name ?? "Item"}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrdersBulkActionBar({
  selectedIds,
  orders,
  onClearSelection,
}: {
  selectedIds: Set<string>;
  orders: Order[];
  onClearSelection: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds],
  );

  if (selectedIds.size === 0) return null;

  return (
    <div className={cn("sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 backdrop-blur-sm", ORDERS_ACCENT.selectionBar)}>
      <p className="text-sm font-medium">
        {selectedIds.size} order{selectedIds.size === 1 ? "" : "s"} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await bulkUpdateOrderStatusAction(
                Array.from(selectedIds),
                "shipped",
              );
              void queryClient.invalidateQueries({
                queryKey: ["admin", "orders"],
              });
              onClearSelection();
            });
          }}
        >
          <Truck data-icon="inline-start" />
          Mark as fulfilled
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => printShippingLabels(Array.from(selectedIds))}
        >
          <Printer data-icon="inline-start" />
          Print shipping labels
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportOrdersCsv(selectedOrders)}
        >
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X data-icon="inline-start" />
          Clear
        </Button>
      </div>
    </div>
  );
}

export { exportOrdersCsv };

export function OrdersDataTable({
  orders,
  selectedIds,
  onSelectedIdsChange,
}: {
  orders: Order[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
}) {
  const pageIds = orders.map((o) => o.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  function toggleAllOnPage(checked: boolean) {
    onSelectedIdsChange(
      (() => {
        const next = new Set(selectedIds);
        if (checked) pageIds.forEach((id) => next.add(id));
        else pageIds.forEach((id) => next.delete(id));
        return next;
      })(),
    );
  }

  function toggleRow(id: string, checked: boolean) {
    onSelectedIdsChange(
      (() => {
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      })(),
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Package className="size-10 text-muted-foreground/40" aria-hidden />
        <p className="text-sm text-muted-foreground">No orders in this view.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/60 hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select all orders on this page"
              checked={allPageSelected}
              onCheckedChange={(checked) => toggleAllOnPage(checked === true)}
            />
          </TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Fulfillment</TableHead>
          <TableHead>Items</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const isSelected = selectedIds.has(order.id);
          const total = Number(order.total_amount ?? 0);

          return (
            <TableRow
              key={order.id}
              data-state={isSelected ? "selected" : undefined}
              className={cn(
                "border-b border-border/60 hover:bg-muted/40",
                ORDERS_ACCENT.selectedRow,
              )}
            >
              <TableCell>
                <Checkbox
                  aria-label={`Select order ${shortOrderRef(order.id)}`}
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    toggleRow(order.id, checked === true)
                  }
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className={cn(
                    "font-mono text-[13px] font-medium leading-snug text-foreground hover:text-primary hover:underline",
                  )}
                >
                  #{shortOrderRef(order.id)}
                </Link>
              </TableCell>
              <TableCell>
                <CustomerPopover order={order} />
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                {order.created_at
                  ? format(new Date(order.created_at), "MMM d, yyyy")
                  : "—"}
              </TableCell>
              <TableCell>
                <PaymentPill paymentStatus={order.payment_status} />
              </TableCell>
              <TableCell>
                <FulfillmentPill status={order.status} />
              </TableCell>
              <TableCell>
                <ItemsPopover order={order} />
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {formatInr(total)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Order actions"
                      />
                    }
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        nativeButton={false}
                        render={<Link href={`/admin/orders/${order.id}`} />}
                      >
                        View order
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        nativeButton={false}
                        render={
                          <Link
                            href={`/admin/orders/${order.id}/invoice`}
                            target="_blank"
                          />
                        }
                      >
                        Print invoice
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => exportOrdersCsv([order])}>
                        Export row
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
