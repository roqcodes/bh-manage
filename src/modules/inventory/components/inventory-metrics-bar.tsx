"use client";

import Link from "next/link";
import { ChevronDown, Download } from "lucide-react";

import type { InventoryCatalogStats } from "@/common/admin/types";
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

export function InventoryMetricsBar({
  stats,
  onExport,
}: {
  stats: InventoryCatalogStats;
  onExport: () => void;
}) {
  const healthyPct =
    stats.totalSkus > 0
      ? Math.round((stats.healthySkus / stats.totalSkus) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Central inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Variant-level warehouse stock. Override counts when reconciling.
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
                  Open procurement
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden border border-border py-0 ring-0">
        <div className="flex flex-col lg:flex-row lg:divide-x lg:divide-border">
          <MetricSegment
            label="Tracked SKUs"
            value={stats.totalSkus.toLocaleString("en-IN")}
            trend={`${healthyPct}% healthy`}
            trendTone="neutral"
            sparkSeed={stats.totalSkus}
          />
          <MetricSegment
            label="Healthy (≥10)"
            value={stats.healthySkus.toLocaleString("en-IN")}
            trend={healthyPct > 0 ? `${healthyPct}%` : "0%"}
            sparkSeed={stats.healthySkus + 3}
            sparkTone="green"
          />
          <MetricSegment
            label="Low (1–9)"
            value={stats.lowStockSkus.toLocaleString("en-IN")}
            trend={
              stats.lowStockSkus > 0 ? "Needs attention" : "None flagged"
            }
            trendTone="neutral"
            sparkSeed={stats.lowStockSkus + 7}
            sparkTone="neutral"
          />
          <MetricSegment
            label="Critical"
            value={stats.criticalSkus.toLocaleString("en-IN")}
            trend={
              stats.criticalSkus > 0 ? "Out of stock" : "None flagged"
            }
            trendTone={stats.criticalSkus > 0 ? "down" : "neutral"}
            sparkSeed={stats.criticalSkus + 11}
            sparkTone="neutral"
            flatSpark={stats.criticalSkus === 0}
          />
        </div>
      </Card>
    </div>
  );
}
