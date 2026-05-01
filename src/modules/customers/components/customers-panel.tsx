"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { ShieldOff, ShieldCheck, Eye, Users, Copy, Check } from "lucide-react";
import { format } from "date-fns";

import type { AdminUser } from "@/common/admin/types";
import {
  blockUserAction,
  unblockUserAction,
} from "@/modules/users/actions/users.actions";
import { TableShell, EmptyState } from "@/modules/admin/components/empty-state";
import { Pagination } from "@/modules/admin/components/pagination";
import { Modal } from "@/modules/admin/components/modal";

import Link from "next/link";

export function CustomersPanel({
  users,
  total,
  page,
}: {
  users: AdminUser[];
  total: number;
  page: number;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopyEmail(email: string, id: string) {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleBlock(userId: string) {
    startTransition(async () => {
      await blockUserAction(userId);
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    });
  }

  function handleUnblock(userId: string) {
    startTransition(async () => {
      await unblockUserAction(userId);
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    });
  }

  return (
    <>
      <TableShell>
        {users.length === 0 ? (
          <EmptyState icon={<Users size={48} />} message="No customers found." />
        ) : (
          <>
            <div className="hidden grid-cols-[1.2fr_1.5fr_100px_80px_100px_80px] border-b border-slate-100 px-5 py-3 lg:grid">
              {["User", "Email", "Type", "Orders", "Status", ""].map((h, i) => (
                <span
                  key={i}
                  className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400"
                >
                  {h}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-slate-50">
              {users.map((user) => {
                const blocked = user.is_verified === false;
                
                const roleKey = user.role?.toLowerCase() || "retail";
                const roleColors: Record<string, string> = {
                  vendor: "bg-blue-50 text-blue-700 border-blue-200",
                  delivery: "bg-orange-50 text-orange-700 border-orange-200",
                  retail: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  admin: "bg-purple-50 text-purple-700 border-purple-200",
                };
                const typeColor = roleColors[roleKey] || "bg-slate-50 text-slate-700 border-slate-200";
                const typeLabel = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Retail";

                return (
                  <li key={user.id}>
                    <div className="grid grid-cols-1 items-center gap-2 px-5 py-4 hover:bg-slate-50/60 lg:grid-cols-[1.2fr_1.5fr_100px_80px_100px_80px] lg:gap-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {user.name ?? "—"}
                          </p>
                          {user.created_at && (
                            <p className="text-xs text-slate-400">
                              Joined{" "}
                              {format(new Date(user.created_at), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-1.5 lg:pr-4">
                        <span className="truncate text-sm text-slate-600">
                          {user.email ?? "—"}
                        </span>
                        {user.email && (
                          <button
                            onClick={() => handleCopyEmail(user.email!, user.id)}
                            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Copy email"
                          >
                            {copiedId === user.id ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${typeColor}`}
                        >
                          {typeLabel}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {user.order_count ?? 0}
                      </span>
                      <span
                        className={[
                          "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide",
                          blocked
                            ? "bg-red-50 text-red-600"
                            : "bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${blocked ? "bg-red-400" : "bg-emerald-500"}`}
                        />
                        {blocked ? "Blocked" : "Active"}
                      </span>
                      <div className="flex gap-1.5">
                        <Link
                          href={`/admin/customers/${user.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                          title="View customer details"
                        >
                          <Eye size={13} />
                        </Link>
                        {blocked ? (
                          <button
                            disabled={isPending}
                            onClick={() => handleUnblock(user.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                            title="Unblock"
                          >
                            <ShieldCheck size={13} />
                          </button>
                        ) : (
                          <button
                            disabled={isPending}
                            onClick={() => handleBlock(user.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                            title="Block"
                          >
                            <ShieldOff size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination
              total={total}
              page={page}
              basePath="/admin/customers"
              extraParams={{}}
            />
          </>
        )}
      </TableShell>
    </>
  );
}
