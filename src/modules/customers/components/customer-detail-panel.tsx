"use client";

import { useMemo, useTransition, type ReactNode } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Mail,
  Package,
  Phone,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import type { Order } from "@/common/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/modules/admin/components/pagination";
import { StatusBadge } from "@/modules/admin/components/status-badge";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import {
  blockUserAction,
  unblockUserAction,
} from "@/modules/users/actions/users.actions";
import { currencyLabel, formatInr } from "@/lib/format-currency";
import { CurrencyAmount } from "@/components/currency-amount";
import type { CustomerDetailsResponse } from "@/modules/customers/services/customers.service";
import { formatCustomerId } from "@/modules/customers/components/customers-ui";

function GlanceMetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Card size="sm" className="border border-border ring-0">
      <CardHeader className="border-b border-border pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-3">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardContent>
    </Card>
  );
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
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const { summary, wallet } = details;

  const metrics = useMemo(() => {
    const credits = wallet.transactions.filter((tx) => tx.type === "credit").length;
    const debits = wallet.transactions.filter((tx) => tx.type === "debit").length;
    const orderTotal = orders.reduce(
      (sum, order) => sum + Number(order.total_amount ?? 0),
      0,
    );
    return {
      orders: orders.length,
      orderTotal,
      transactions: wallet.transactionsCount,
      credits,
      debits,
    };
  }, [orders, wallet.transactions, wallet.transactionsCount]);

  const verified = summary.is_verified !== false;

  function handleToggleBlock() {
    startTransition(async () => {
      if (verified) {
        await blockUserAction(summary.id);
      } else {
        await unblockUserAction(summary.id);
      }
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.customerDetail(summary.id, txPage),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="border border-border ring-0">
        <CardContent className="flex flex-col gap-3 py-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {verified ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">Blocked</Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-semibold">
              {summary.name ?? "Unknown customer"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {summary.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" aria-hidden />
                  {summary.email}
                </span>
              ) : null}
              {summary.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" aria-hidden />
                  {summary.phone}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatCustomerId({
                id: summary.id,
                name: summary.name,
                email: summary.email,
                phone: summary.phone,
                role: summary.role,
                is_verified: summary.is_verified,
                created_at: summary.created_at,
              })}
              {summary.created_at
                ? ` · Joined ${format(new Date(summary.created_at), "MMM d, yyyy")}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" disabled={isPending} onClick={handleToggleBlock}>
              {verified ? (
                <>
                  <Ban data-icon="inline-start" />
                  Block customer
                </>
              ) : (
                <>
                  <ShieldCheck data-icon="inline-start" />
                  Unblock customer
                </>
              )}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/admin/orders?userId=${summary.id}`} />}
            >
              <Package data-icon="inline-start" />
              View orders
            </Button>
          </div>
        </CardContent>
      </Card>

      <section aria-label="Customer summary">
        <p className="mb-3 text-sm font-medium">At a glance</p>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <GlanceMetricCard
            title={currencyLabel("Wallet balance")}
            value={formatInr(wallet.balance)}
            description="Current available balance"
          />
          <GlanceMetricCard
            title="Recent orders"
            value={metrics.orders.toLocaleString("en-IN")}
            description={
              metrics.orders > 0
                ? `${formatInr(metrics.orderTotal)} across recent orders`
                : "No orders on this account yet"
            }
          />
          <GlanceMetricCard
            title="Transactions"
            value={metrics.transactions.toLocaleString("en-IN")}
            description={`${metrics.credits} credits · ${metrics.debits} debits on this page`}
          />
          <GlanceMetricCard
            title="Account status"
            value={verified ? "Active" : "Blocked"}
            description={
              verified ? "Customer can place orders" : "Customer is blocked"
            }
          />
        </div>
      </section>

      <Card className="border border-border ring-0">
        <CardHeader className="border-b border-border">
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>
            Wallet credits and debits for this customer.
          </CardDescription>
          <CardAction>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5" aria-hidden />
              <CurrencyAmount amount={wallet.balance} />
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {wallet.transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <Wallet className="size-10 text-muted-foreground/40" aria-hidden />
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">{currencyLabel("Amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(tx.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          tx.type === "credit"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft data-icon="inline-start" />
                        ) : (
                          <ArrowUpRight data-icon="inline-start" />
                        )}
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                      {tx.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {tx.type === "credit" ? "+" : "-"}
                      {formatInr(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {wallet.transactionsCount > 10 ? (
            <div className="border-t px-3 py-2">
              <Pagination
                page={txPage}
                total={wallet.transactionsCount}
                basePath={`/admin/customers/${summary.id}`}
                pageParam="txPage"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border border-border ring-0">
        <CardHeader className="border-b border-border">
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Latest purchases from this customer.</CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/admin/orders?userId=${summary.id}`} />}
            >
              View all
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <Package className="size-10 text-muted-foreground/40" aria-hidden />
              <p className="text-sm text-muted-foreground">No orders found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">{currencyLabel("Total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        #{order.id.split("-")[0]?.toUpperCase() ?? order.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {order.created_at
                        ? format(new Date(order.created_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatInr(Number(order.total_amount ?? 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
