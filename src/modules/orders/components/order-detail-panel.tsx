"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { CreditCard, Package, User, Hash, Printer } from "lucide-react";

import type { OrderWithItems } from "@/common/admin/types";
import { updateOrderStatusAction } from "@/modules/orders/actions/orders.actions";
import { selectCls } from "@/modules/admin/components/modal";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

const HERO_TINT =
  "linear-gradient(135deg, rgba(225, 29, 72, 0.12), rgba(99, 102, 241, 0.1))";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function shortOrderRef(id: string) {
  return id.split("-")[0]?.toUpperCase() ?? id.slice(0, 8);
}

export function OrderDetailPanel({ order }: { order: OrderWithItems }) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateOrderStatusAction(order.id, status);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.orderDetail(order.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    });
  }

  const paid = order.payment_status === "paid";

  return (
    <div className="space-y-6 lg:space-y-7">
      <div className={`${CARD} overflow-hidden`}>
        <div
          className="relative border-b border-slate-100/80 px-5 py-8 sm:px-8 sm:py-10"
          style={{ background: HERO_TINT }}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Order
              </p>
              <h2 className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                #{shortOrderRef(order.id)}
              </h2>
              <p className="mt-2 max-w-xl font-mono text-[11px] font-medium text-slate-400 sm:text-xs">
                {order.id}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <select
                disabled={isPending}
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                aria-label="Order status"
                className={`${selectCls} !h-10 min-h-[2.5rem] min-w-[10.5rem] py-0 text-[13px] font-semibold leading-none`}
              >
                {(
                  [
                    "pending",
                    "processing",
                    "shipped",
                    "delivered",
                    "cancelled",
                  ] as const
                ).map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <Link
                href={`/admin/orders/${order.id}/invoice`}
                scroll={false}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white px-3.5 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:px-4"
              >
                <Printer className="size-4 shrink-0" aria-hidden />
                Print invoice
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-slate-100/90 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <Hash className="size-3.5 text-slate-400" aria-hidden />
              Placed
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {order.created_at
                ? format(new Date(order.created_at), "MMM d, yyyy")
                : "—"}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {order.created_at
                ? format(new Date(order.created_at), "h:mm a")
                : ""}
            </p>
          </div>
          <div className="bg-white p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <User className="size-3.5 text-slate-400" aria-hidden />
              Customer
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {order.users?.name ?? "—"}
            </p>
            {order.users?.email ? (
              <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
                {order.users.email}
              </p>
            ) : null}
            {order.users?.phone ? (
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                {order.users.phone}
              </p>
            ) : null}
          </div>
          <div className="bg-white p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <CreditCard className="size-3.5 text-slate-400" aria-hidden />
              Payment
            </div>
            <p className="mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${
                  paid
                    ? "bg-emerald-50/90 text-emerald-800 ring-emerald-200/60"
                    : "bg-amber-50/90 text-amber-900 ring-amber-200/60"
                }`}
              >
                {order.payment_status ?? "pending"}
              </span>
            </p>
          </div>
          <div className="bg-white p-5 sm:col-span-2 lg:col-span-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Order total
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {formatInr(Number(order.total_amount ?? 0))}
            </p>
          </div>
        </div>
      </div>

      <section aria-label="Line items">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm ring-1 ring-white/80">
            <Package className="size-3" aria-hidden />
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Line items ({order.order_items.length})
          </h3>
        </div>

        {order.order_items.length === 0 ? (
          <div className={`px-6 py-14 text-center text-sm font-medium text-slate-500 ${CARD}`}>
            No items recorded for this order.
          </div>
        ) : (
          <ul className="space-y-3">
            {order.order_items.map((item) => {
              const unitFinal =
                item.final_price != null
                  ? Number(item.final_price)
                  : Number(item.price ?? 0);
              const lineTotal = unitFinal * Number(item.quantity ?? 1);
              return (
                <li key={item.id}>
                  <div
                    className={`${CARD} flex flex-col gap-4 p-4 transition hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between sm:gap-6`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug text-slate-900">
                        {item.product_name ?? "—"}
                      </p>
                      {item.vendor_id ? (
                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          Vendor{" "}
                          <span className="font-mono text-slate-500">
                            {item.vendor_id.slice(0, 8)}…
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-4 sm:text-right">
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-slate-400">
                          Qty
                        </dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                          {item.quantity ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-slate-400">
                          Base
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-slate-700">
                          {item.base_price != null
                            ? formatInr(Number(item.base_price))
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-slate-400">
                          Margin
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-slate-700">
                          {item.margin_amount != null
                            ? formatInr(Number(item.margin_amount))
                            : "—"}
                        </dd>
                      </div>
                      <div className="col-span-2 border-t border-slate-100 pt-2 sm:col-span-1 sm:border-t-0 sm:pt-0">
                        <dt className="font-semibold uppercase tracking-wide text-slate-400">
                          Line
                        </dt>
                        <dd className="mt-0.5 font-bold tabular-nums text-slate-900">
                          {formatInr(lineTotal)}
                        </dd>
                        <dd className="mt-0.5 text-[11px] font-medium text-slate-500">
                          {formatInr(unitFinal)} / unit
                        </dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
