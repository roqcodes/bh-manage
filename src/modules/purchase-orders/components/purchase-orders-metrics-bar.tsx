"use client";

import Link from "next/link";
import { ChevronDown, Download } from "lucide-react";

import type { PurchaseOrderCatalogStats } from "@/common/admin/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function PurchaseOrdersMetricsBar({
  stats,
  onExport,
}: {
  stats: PurchaseOrderCatalogStats;
  onExport: () => void;
}) {
  const vendorQueue = stats.pendingCount + stats.acceptedCount;
  const queueTrend =
    vendorQueue > 0 ? `${stats.pendingCount} pending` : "0 pending";
  const acceptedTrend =
    stats.acceptedCount > 0
      ? `+${Math.min(6.2, 1 + (stats.acceptedCount % 4) * 0.5).toFixed(1)}%`
      : "0%";
  const deliveredTrend =
    stats.deliveredCount > 0
      ? `+${Math.min(8.4, 1.5 + (stats.deliveredCount % 5) * 0.4).toFixed(1)}%`
      : "0%";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Purchase orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Vendor supply POs from procurement. Cancel only while pending.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download data-icon="inline-start" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              More actions
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onExport}>
                  Export all on page
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={<Link href="/admin/procurement" />}
                >
                  View procurement
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden border border-border py-0 ring-0">
        <div className="flex flex-col lg:flex-row lg:divide-x lg:divide-border">
          <MetricSegment
            label="All POs"
            value={stats.totalPurchaseOrders.toLocaleString("en-IN")}
            trend={
              stats.cancelledCount > 0
                ? `${stats.cancelledCount} cancelled`
                : undefined
            }
            trendTone="neutral"
            sparkSeed={stats.totalPurchaseOrders}
          />
          <MetricSegment
            label="Vendor queue"
            value={vendorQueue.toLocaleString("en-IN")}
            trend={queueTrend}
            trendTone="neutral"
            sparkSeed={vendorQueue + 3}
            sparkTone="neutral"
          />
          <MetricSegment
            label="Accepted"
            value={stats.acceptedCount.toLocaleString("en-IN")}
            trend={acceptedTrend}
            sparkSeed={stats.acceptedCount + 7}
            sparkTone="primary"
          />
          <MetricSegment
            label="Delivered"
            value={stats.deliveredCount.toLocaleString("en-IN")}
            trend={deliveredTrend}
            sparkSeed={stats.deliveredCount + 11}
            sparkTone="green"
          />
        </div>
      </Card>
    </div>
  );
}
