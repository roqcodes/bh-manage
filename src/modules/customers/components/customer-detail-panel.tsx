"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  Ban,
  TrendingUp,
} from "lucide-react";

import type { CustomerDetailsResponse, WalletTransaction } from "@/modules/customers/services/customers.service";
import { Pagination } from "@/modules/admin/components/pagination";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import type { Order } from "@/common/admin/types";

const BRAND = "#2563EB";
const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function CustomerDetailPanel({
  details,
  txPage,
  orders,
}: {
  details: CustomerDetailsResponse;
  txPage: number;
  orders: Order[];
}) {
  const { summary, wallet } = details;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* HEADER CARD */}
      <section className={`${CARD} flex flex-col p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6`}>
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-extrabold text-slate-600 ring-4 ring-white shadow-sm">
            {summary.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {summary.name ?? "Unknown Customer"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-medium text-slate-500">
              {summary.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 opacity-70" />
                  {summary.email}
                </span>
              )}
              {summary.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 opacity-70" />
                  {summary.phone}
                </span>
              )}
              {summary.is_verified ? (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <ShieldCheck className="size-3.5 opacity-70" />
                  Verified
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-500">
                  <Ban className="size-3.5 opacity-70" />
                  Unverified
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Joined
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Calendar className="size-4 text-slate-400" />
            {summary.created_at ? format(new Date(summary.created_at), "MMM d, yyyy") : "—"}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* LEFT COLUMN: WALLET & OVERVIEW */}
        <div className="space-y-6 lg:col-span-1">
          {/* WALLET CARD */}
          <div className={`${CARD} p-6`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Wallet Balance
              </p>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/55 bg-slate-50 text-slate-500">
                <Wallet className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-4xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {formatInr(wallet.balance)}
            </p>
            <div className="mt-4 flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/10">
                <ArrowDownLeft className="size-3.5" />
                Credits
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-rose-50/50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-500/10">
                <ArrowUpRight className="size-3.5" />
                Debits
              </div>
            </div>
          </div>

          <Link
            href={`/admin/orders?userId=${summary.id}`}
            className={`${CARD} group flex items-center justify-between p-4 transition-all hover:border-[color:var(--brand)] hover:shadow-sm`}
            style={{ ["--brand" as string]: BRAND }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[color:var(--brand)] group-hover:bg-[color:var(--brand)]/10">
                <Package className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">All Orders</p>
                <p className="text-xs font-medium text-slate-500">View full history</p>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-slate-400 group-hover:text-[color:var(--brand)]" />
          </Link>
        </div>

        {/* RIGHT COLUMN: TRANSACTIONS & RECENT ORDERS */}
        <div className="space-y-6 lg:col-span-2">
          {/* TRANSACTIONS TABLE */}
          <section className={CARD}>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wallet.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    wallet.transactions.map((tx) => (
                      <tr key={tx.id} className="transition hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-6 py-3 text-slate-500 font-medium">
                          {format(new Date(tx.created_at), "MMM d, h:mm a")}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              tx.type === "credit"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600 truncate max-w-[150px]">
                          {tx.reference ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-bold tabular-nums text-slate-900">
                          {tx.type === "credit" ? "+" : "-"}
                          {formatInr(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {wallet.transactionsCount > 10 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <Pagination
                  page={txPage}
                  total={wallet.transactionsCount}
                  basePath={`/admin/customers/${summary.id}`}
                  pageParam="txPage"
                />
              </div>
            )}
          </section>

          {/* RECENT ORDERS TABLE */}
          <section className={CARD}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
              <Link
                href={`/admin/orders?userId=${summary.id}`}
                className="text-xs font-semibold text-[color:var(--brand)] hover:underline"
                style={{ ["--brand" as string]: BRAND }}
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="transition hover:bg-slate-50/50">
                        <td className="px-6 py-3">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="font-bold text-[color:var(--brand)] hover:underline"
                            style={{ ["--brand" as string]: BRAND }}
                          >
                            #{o.id.split("-")[0]?.toUpperCase() ?? o.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-slate-500 font-medium">
                          {o.created_at ? format(new Date(o.created_at), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-bold tabular-nums text-slate-900">
                          {formatInr(Number(o.total_amount ?? 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
