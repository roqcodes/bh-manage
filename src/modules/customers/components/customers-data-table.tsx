"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  Users,
  X,
} from "lucide-react";

import type { AdminUser } from "@/common/admin/types";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  blockUserAction,
  bulkBlockUsersAction,
  bulkUnblockUsersAction,
  unblockUserAction,
} from "@/modules/users/actions/users.actions";
import {
  CustomerStatusBadge,
  formatCustomerId,
  isCustomerBlocked,
} from "@/modules/customers/components/customers-ui";

export function exportCustomersCsv(users: AdminUser[]) {
  const headers = ["Name", "ID", "Email", "Phone", "Orders", "Status", "Joined"];

  const rows = users.map((u) => [
    u.name ?? "",
    formatCustomerId(u),
    u.email ?? "",
    u.phone ?? "",
    String(u.order_count ?? 0),
    isCustomerBlocked(u) ? "Blocked" : "Active",
    u.created_at ? format(new Date(u.created_at), "yyyy-MM-dd") : "",
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
  link.download = `customers-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function CustomersBulkActionBar({
  selectedIds,
  onClearSelection,
}: {
  selectedIds: Set<string>;
  onClearSelection: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  if (selectedIds.size === 0) return null;

  const ids = Array.from(selectedIds);

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-accent/50 px-3 py-2 backdrop-blur-sm">
      <p className="text-sm font-medium">
        {selectedIds.size} customer{selectedIds.size === 1 ? "" : "s"} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await bulkUnblockUsersAction(ids);
              void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
              onClearSelection();
            });
          }}
        >
          Unblock selected
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await bulkBlockUsersAction(ids);
              void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
              onClearSelection();
            });
          }}
        >
          <ShieldOff data-icon="inline-start" />
          Block selected
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X data-icon="inline-start" />
          Clear
        </Button>
      </div>
    </div>
  );
}

function EmailCell({ email, userId }: { email: string | null; userId: string }) {
  const [copied, setCopied] = useState(false);

  if (!email?.trim()) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate text-sm text-muted-foreground">{email}</span>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Copy email"
        onClick={() => {
          void navigator.clipboard.writeText(email);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="text-emerald-600" /> : <Copy />}
      </Button>
    </div>
  );
}

export function CustomersDataTable({
  users,
  selectedIds,
  onSelectedIdsChange,
}: {
  users: AdminUser[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const pageIds = users.map((u) => u.id);
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

  function runBlock(userId: string, block: boolean) {
    startTransition(async () => {
      if (block) await blockUserAction(userId);
      else await unblockUserAction(userId);
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    });
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Users className="size-10 text-muted-foreground/40" aria-hidden />
        <p className="text-sm text-muted-foreground">No customers in this view.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/60 hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select all customers on this page"
              checked={allPageSelected}
              onCheckedChange={(checked) => toggleAllOnPage(checked === true)}
            />
          </TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Orders</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isSelected = selectedIds.has(user.id);
          const blocked = isCustomerBlocked(user);

          return (
            <TableRow
              key={user.id}
              data-state={isSelected ? "selected" : undefined}
              className="border-b border-border/60 hover:bg-muted/40 data-[state=selected]:bg-accent/60"
            >
              <TableCell>
                <Checkbox
                  aria-label={`Select ${user.name ?? "customer"}`}
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    toggleRow(user.id, checked === true)
                  }
                />
              </TableCell>
              <TableCell>
                <div className="min-w-0">
                  <Link
                    href={`/admin/customers/${user.id}`}
                    className="text-[13px] font-medium leading-snug text-foreground hover:text-primary hover:underline"
                  >
                    {user.name ?? "Unnamed customer"}
                  </Link>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatCustomerId(user)}
                    {user.created_at
                      ? ` · Joined ${format(new Date(user.created_at), "MMM d, yyyy")}`
                      : ""}
                  </p>
                </div>
              </TableCell>
              <TableCell className="max-w-[220px]">
                <EmailCell email={user.email} userId={user.id} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.phone?.trim() ? user.phone : "—"}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {(user.order_count ?? 0).toLocaleString("en-IN")}
              </TableCell>
              <TableCell>
                <CustomerStatusBadge user={user} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Customer actions"
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          nativeButton={false}
                          render={<Link href={`/admin/customers/${user.id}`} />}
                        >
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isPending}
                          onClick={() => runBlock(user.id, !blocked)}
                        >
                          {blocked ? <ShieldCheck /> : <ShieldOff />}
                          {blocked ? "Unblock" : "Block"}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          nativeButton={false}
                          render={
                            <Link href={`/admin/orders?userId=${user.id}`} />
                          }
                        >
                          View orders
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
