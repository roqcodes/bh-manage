"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Trash2 } from "lucide-react";

import type { ProcurementInsights } from "@/common/admin/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";
import {
  runProcurementEngineAction,
  synchronizeProcurementPlanAction,
} from "@/modules/procurement/actions/procurement.actions";
import { approveProcurementPlanAction } from "@/modules/purchase-orders/actions/purchase-orders.actions";
import { ProcurementMetricsBar } from "@/modules/procurement/components/procurement-metrics-bar";
import { formatProcurementInr } from "@/modules/procurement/components/procurement-ui";
import type { AllocationLine, ProcurementPlan } from "@/modules/procurement/types";

function VendorSummaryCard({
  vendorName,
  vendorId,
  totalQty,
  totalCost,
}: {
  vendorName: string | null;
  vendorId: string;
  totalQty: number;
  totalCost: number;
}) {
  return (
    <Card size="sm" className="border border-border ring-0">
      <CardHeader className="border-b border-border pb-2">
        <CardTitle className="text-sm font-medium">
          {vendorName?.trim() || "Unnamed vendor"}
        </CardTitle>
        <CardDescription className="font-mono text-[10px]">
          {vendorId.slice(0, 8).toUpperCase()}…
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Total qty</span>
          <span className="font-semibold tabular-nums">
            {totalQty.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Total cost</span>
          <span className="font-semibold tabular-nums">
            {formatProcurementInr(totalCost)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProcurementWorkspace() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState<ProcurementPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approveMsg, setApproveMsg] = useState<string | null>(null);

  const { data: insightsData } = useQuery({
    queryKey: adminQueryKeys.procurement(),
    queryFn: () => adminGet<{ insights: ProcurementInsights }>("procurement"),
  });

  const insights = insightsData?.insights ?? {
    pipelineDemandUnits: 0,
    availableInventoryUnits: 0,
    shortageUnits: 0,
    pipelineShortageVariants: 0,
    demandTodayUnits: 0,
    productsNeedingRestock: 0,
  };

  const lines = plan?.allocations ?? [];
  const vendorsInPlan = [...new Set(lines.map((l) => l.vendor_id))];

  function invalidateInsights() {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.procurement() });
  }

  function runEngine() {
    setError(null);
    setApproveMsg(null);
    startTransition(async () => {
      try {
        const p = await runProcurementEngineAction();
        setPlan(p);
        invalidateInsights();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run engine.");
      }
    });
  }

  function syncFromAllocations(next: AllocationLine[]) {
    startTransition(async () => {
      try {
        const p = await synchronizeProcurementPlanAction(next);
        setPlan(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to sync plan.");
      }
    });
  }

  function updateQty(index: number, qty: number) {
    if (!plan) return;
    const next = [...plan.allocations];
    if (!next[index]) return;
    next[index] = { ...next[index], allocated_qty: qty };
    syncFromAllocations(next);
  }

  function removeLine(index: number) {
    if (!plan) return;
    const next = plan.allocations.filter((_, i) => i !== index);
    syncFromAllocations(next);
  }

  function removeVendor(vendorId: string) {
    if (!plan) return;
    const next = plan.allocations.filter((l) => l.vendor_id !== vendorId);
    syncFromAllocations(next);
  }

  function approve() {
    setError(null);
    setApproveMsg(null);
    if (!plan) return;
    const normalized = plan.allocations.filter((l) => l.allocated_qty > 0);
    if (normalized.length === 0) {
      setError("Nothing to approve.");
      return;
    }
    startTransition(async () => {
      try {
        const { poIds } = await approveProcurementPlanAction(normalized);
        setApproveMsg(`Created ${poIds.length} purchase order(s).`);
        setPlan(null);
        invalidateInsights();
        void queryClient.invalidateQueries({ queryKey: ["admin", "purchase-orders"] });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Approval failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ProcurementMetricsBar
        insights={insights}
        planLineCount={lines.length}
        planVendorCount={vendorsInPlan.length}
        planTotalCost={plan?.system_total_cost ?? 0}
        onRunEngine={runEngine}
        isRunning={isPending}
      />

      <Card className="border border-border ring-0">
        <CardHeader className="border-b border-border">
          <CardTitle>How procurement works</CardTitle>
          <CardDescription>
            Customers buy from central inventory at list price. When orders create a
            shortage, this engine builds purchase orders from vendors at vendor cost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-1.5">
            <li>Run engine — compares open order demand vs central stock.</li>
            <li>Review allocations — lowest vendor cost first per SKU.</li>
            <li>Approve — creates purchase orders; stock increases when POs are received.</li>
            <li>
              Optional — on each product page, enable smart pricing assist to suggest
              list prices from vendor cost and margin rules.
            </li>
          </ol>
          <p>
            Manage vendor offers under{" "}
            <Link href="/admin/vendors" className="font-medium text-primary hover:underline">
              Vendors
            </Link>
            . Customer list prices under{" "}
            <Link href="/admin/products" className="font-medium text-primary hover:underline">
              Products
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border ring-0">
        <CardHeader className="border-b border-border">
          <CardTitle>Procurement plan</CardTitle>
          <CardDescription>
            Demand from pending and processing orders vs central inventory; lowest
            vendor cost first.
          </CardDescription>
          {vendorsInPlan.length > 0 ? (
            <CardAction>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Remove vendor</span>
                {vendorsInPlan.map((vid) => {
                  const label =
                    plan?.by_vendor.find((g) => g.vendor_id === vid)?.vendor_name?.trim() ||
                    `${vid.slice(0, 8)}…`;
                  return (
                    <Button
                      key={vid}
                      size="sm"
                      variant="outline"
                      onClick={() => removeVendor(vid)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-0 pt-0">
          {error ? (
            <Alert variant="destructive" className="mx-4 mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {approveMsg ? (
            <Alert className="mx-4 mt-4">
              <AlertDescription>{approveMsg}</AlertDescription>
            </Alert>
          ) : null}

          {plan && plan.by_vendor.length > 0 ? (
            <div className="grid gap-2.5 px-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {plan.by_vendor.map((g) => (
                <VendorSummaryCard
                  key={g.vendor_id}
                  vendorName={g.vendor_name}
                  vendorId={g.vendor_id}
                  totalQty={g.total_allocated_quantity}
                  totalCost={g.total_cost}
                />
              ))}
            </div>
          ) : null}

          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Package className="size-10 text-muted-foreground/40" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No allocations yet. Run the engine when orders create a central stock
                shortage.
              </p>
              <Button onClick={runEngine} disabled={isPending}>
                Run engine
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Vendor</TableHead>
                    <TableHead>Product · variant</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead>Vendor cost</TableHead>
                    <TableHead>Line total</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={`${line.vendor_product_id}-${index}`}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {line.vendor_name?.trim() || "—"}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {line.vendor_id.slice(0, 8).toUpperCase()}…
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {line.product_name?.trim() || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {line.variant_name?.trim() || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-20 tabular-nums"
                          type="number"
                          min={0}
                          value={line.allocated_qty}
                          onChange={(e) =>
                            updateQty(index, parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatProcurementInr(line.base_price)}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {formatProcurementInr(line.total_cost)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => removeLine(index)}
                          aria-label="Remove line"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">System total</span>
                  <Badge variant="outline" className="text-sm font-semibold tabular-nums">
                    {formatProcurementInr(plan?.system_total_cost ?? 0)}
                  </Badge>
                </div>
                <Button onClick={approve} disabled={isPending}>
                  Approve & create purchase orders
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
