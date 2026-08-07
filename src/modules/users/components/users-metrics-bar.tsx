"use client";

import type { UserCatalogStats } from "@/modules/users/services/users.service";
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

export function UsersMetricsBar({
  stats,
  onExport,
}: {
  stats: UserCatalogStats;
  onExport: () => void;
}) {
  const portalStaff = stats.vendor + stats.delivery + stats.admin;
  const blockedStores = Math.max(0, stats.stores - stats.storesActive);
  const activePct =
    stats.stores > 0 ? Math.round((stats.storesActive / stats.stores) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team & Users</h1>
          <p className="text-sm text-muted-foreground">
            Retail stores, portal staff, and access requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            Export
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border border-border py-0 ring-0">
        <div className="flex flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
          <MetricSegment
            label="Store accounts"
            value={stats.stores.toLocaleString("en-IN")}
            trend={`${activePct}% active`}
            sparkSeed={stats.stores}
          />
          <MetricSegment
            label="Portal staff"
            value={portalStaff.toLocaleString("en-IN")}
            trend={`${stats.vendor} vendors · ${stats.delivery} delivery`}
            trendTone="neutral"
            sparkSeed={portalStaff + 3}
            sparkTone="green"
          />
          <MetricSegment
            label="Pending requests"
            value={stats.pendingRequests.toLocaleString("en-IN")}
            trendTone={stats.pendingRequests > 0 ? "down" : "neutral"}
            sparkSeed={stats.pendingRequests}
            sparkTone="neutral"
            flatSpark
          />
          <MetricSegment
            label="Blocked stores"
            value={blockedStores.toLocaleString("en-IN")}
            trend={`${stats.admin} admins`}
            trendTone="neutral"
            sparkSeed={blockedStores + 5}
            sparkTone="primary"
          />
        </div>
      </Card>
    </div>
  );
}
