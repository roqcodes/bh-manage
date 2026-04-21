"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Building2,
  CreditCard,
  Hash,
  Package,
  ExternalLink,
  Printer,
} from "lucide-react";

import type { AdminPurchaseOrderDetail } from "@/common/admin/types";
import { cancelAdminPurchaseOrderAction } from "@/modules/purchase-orders/actions/admin-purchase-orders.actions";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

const BRAND = "#2563EB";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

const HERO_TINT =
  "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(209, 20, 57, 0.08))";

function formatMoney(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

function shortPoRef(id: string) {
  return `${id.slice(0, 8)}…`;
}

function lineTotal(qty: number | null, price: number | null) {
  if (qty == null || price == null) return null;
  return qty * price;
}

export function AdminPurchaseOrderDetailView({
  po,
}: {
  po: AdminPurchaseOrderDetail;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const status = po.status ?? "";
  const items = po.purchase_order_items ?? [];
  const vendor = po.vendors;
  const vendorId = po.vendor_id;

  function onCancel() {
    setMessage(null);
    startTransition(async () => {
      const res = await cancelAdminPurchaseOrderAction(po.id);
      if (!res.ok) {
        setMessage(res.message ?? "Could not cancel.");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.purchaseOrderDetail(po.id),
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "purchase-orders"],
      });
    });
  }

  const canCancel = status === "pending";

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
                Purchase order
              </p>
              <h2 className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {shortPoRef(po.id)}
              </h2>
              <p className="mt-2 max-w-2xl font-mono text-[11px] font-medium text-slate-400 sm:text-xs">
                {po.id}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <StatusBadge status={status} />
              {canCancel ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={onCancel}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 text-[12px] font-semibold text-rose-800 shadow-sm transition hover:bg-rose-100/90 disabled:opacity-50"
                >
                  {isPending ? "Cancelling…" : "Cancel PO"}
                </button>
              ) : null}
              <Link
                href={`/admin/purchase-orders/${po.id}/invoice`}
                scroll={false}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white px-3.5 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:px-4"
              >
                <Printer className="size-4 shrink-0" aria-hidden />
                Print invoice
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-slate-100/90 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <Hash className="size-3.5 text-slate-400" aria-hidden />
              Created
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {po.created_at
                ? format(new Date(po.created_at), "MMM d, yyyy")
                : "—"}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {po.created_at
                ? format(new Date(po.created_at), "h:mm a")
                : ""}
            </p>
          </div>
          <div className="bg-white p-5 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <Building2 className="size-3.5 text-slate-400" aria-hidden />
              Vendor
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {vendor?.name?.trim() || "—"}
            </p>
            {vendor?.contact ? (
              <p className="mt-1 text-[12px] font-medium text-slate-600">
                {vendor.contact}
              </p>
            ) : null}
            {vendor?.id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="font-mono text-[10px] font-medium text-slate-400">
                  {vendor.id}
                </p>
                {vendorId ? (
                  <Link
                    href={`/admin/vendors/${vendorId}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[color:var(--brand)] ring-1 ring-[color:var(--brand)]/20 transition hover:bg-[color:var(--brand)]/5"
                    style={{ ["--brand" as string]: BRAND }}
                  >
                    Open vendor
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="bg-white p-5 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <CreditCard className="size-3.5 text-slate-400" aria-hidden />
              PO total
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {formatMoney(po.total_amount)}
            </p>
            <p className="mt-2 max-w-xl text-[12px] font-medium leading-relaxed text-slate-500">
              Vendors accept or fulfil POs from their portal. You can cancel only
              while status is pending.
            </p>
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 text-sm font-semibold text-rose-800">
          {message}
        </div>
      ) : null}

      <section aria-label="Line items">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm ring-1 ring-white/80">
            <Package className="size-3" aria-hidden />
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Line items ({items.length})
          </h3>
        </div>

        {items.length === 0 ? (
          <div className={`px-6 py-14 text-center text-sm font-medium text-slate-500 ${CARD}`}>
            No line items on this purchase order.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((line) => {
              const pv = line.product_variants;
              const productName = pv?.products?.name ?? "—";
              const variantName = pv?.name ?? "—";
              const lt = lineTotal(line.quantity, line.price);
              return (
                <li key={line.id}>
                  <div
                    className={`${CARD} flex flex-col gap-4 p-4 transition hover:shadow-[0_2px_14px_-4px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug text-slate-900">
                        {productName}
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-600">
                        {variantName}
                      </p>
                      {line.variant_id ? (
                        <p className="mt-1 font-mono text-[10px] font-medium text-slate-400">
                          {line.variant_id}
                        </p>
                      ) : null}
                    </div>
                    <dl className="grid shrink-0 grid-cols-3 gap-x-6 gap-y-1 text-[12px] sm:text-right">
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-slate-400">
                          Qty
                        </dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                          {line.quantity ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-slate-400">
                          Unit
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-slate-700">
                          {formatMoney(line.price)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-slate-400">
                          Line
                        </dt>
                        <dd className="mt-0.5 font-bold tabular-nums text-slate-900">
                          {lt != null ? formatMoney(lt) : "—"}
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
