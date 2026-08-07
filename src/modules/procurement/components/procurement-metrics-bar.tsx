"use client";

import Link from "next/link";
import { Cpu, ExternalLink } from "lucide-react";

import type { ProcurementInsights } from "@/common/admin/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MiniSparkline,
  TrendBadge,
} from "@/modules/orders/components/orders-ui";

function MetricSegment({
  label,
  value,
  trend,
  trendTone = "up",
  sparkSeed,
  sparkTone = "primary",
  flatSpark = false,
}: {
  label: string;
  value: string;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
  sparkSeed: number;
  sparkTone?: "primary" | "neutral" | "green";
  flatSpark?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          {trend ? <TrendBadge value={trend} tone={trendTone} /> : null}
        </div>
      </div>
      <MiniSparkline seed={sparkSeed} tone={sparkTone} flat={flatSpark} />
    </div>
  );
}

export function ProcurementMetricsBar({
  insights,
  planLineCount,
  planVendorCount,
  planTotalCost,
  onRunEngine,
  isRunning,
}: {
  insights: ProcurementInsights;
  planLineCount: number;
  planVendorCount: number;
  planTotalCost: number;
  onRunEngine: () => void;
  isRunning: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Procurement</h1>
          <p className="text-sm text-muted-foreground">
            Refill central warehouse when customer orders exceed on-hand stock.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/purchase-orders" />}
          >
            <ExternalLink data-icon="inline-start" />
            Purchase orders
          </Button>
          <Button size="sm" onClick={onRunEngine} disabled={isRunning}>
            <Cpu data-icon="inline-start" />
            {isRunning ? "Running…" : "Run engine"}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border border-border py-0 ring-0">
        <div className="flex flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
          <MetricSegment
            label="Pipeline demand"
            value={insights.pipelineDemandUnits.toLocaleString("en-IN")}
            trend={`${insights.pipelineShortageVariants} SKUs short`}
            trendTone={insights.shortageUnits > 0 ? "down" : "neutral"}
            sparkSeed={insights.pipelineDemandUnits}
          />
          <MetricSegment
            label="Central inventory"
            value={insights.availableInventoryUnits.toLocaleString("en-IN")}
            trend="Units on hand"
            trendTone="neutral"
            sparkSeed={insights.availableInventoryUnits}
            sparkTone="green"
          />
          <MetricSegment
            label="Shortage"
            value={insights.shortageUnits.toLocaleString("en-IN")}
            trend={`${insights.productsNeedingRestock} need restock`}
            trendTone={insights.shortageUnits > 0 ? "down" : "neutral"}
            sparkSeed={insights.shortageUnits}
            sparkTone="neutral"
            flatSpark
          />
          <MetricSegment
            label="Current plan"
            value={planLineCount.toLocaleString("en-IN")}

            trendTone="neutral"
            sparkSeed={planLineCount + Math.floor(planTotalCost)}
            sparkTone="primary"
          />
        </div>
      </Card>
    </div>
  );
}
