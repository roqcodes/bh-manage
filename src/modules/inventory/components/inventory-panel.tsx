"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import {
  ExternalLink,
  MoreHorizontal,
  Package,
  Search,
  Warehouse,
} from "lucide-react";

import type { InventoryCatalogStats, InventoryWithVariant } from "@/common/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { overrideStockAction } from "@/modules/inventory/actions/inventory.actions";
import { Pagination } from "@/modules/admin/components/pagination";
import {
  adminPanelStackClass,
  adminStatGridClass,
} from "@/modules/admin/lib/admin-layout";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

type StockFilter = "all" | "healthy" | "low" | "critical";

function formatSku(variantId: string) {
  return variantId.slice(0, 8).toUpperCase();
}

const TITLE_CASE_SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "in",
  "on",
  "at",
  "to",
  "of",
  "with",
]);

function toTitleCase(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return fallback;

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && TITLE_CASE_SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function stockUnits(stock: number | null | undefined) {
  return Math.max(0, Math.floor(Number(stock ?? 0)));
}

function stockFilterFor(stock: number | null | undefined): Exclude<StockFilter, "all"> {
  const units = stockUnits(stock);
  if (units < 1) return "critical";
  if (units < 10) return "low";
  return "healthy";
}

function previewUrlFromRow(row: InventoryWithVariant): string | null {
  const images = row.product_variants?.variant_images ?? [];
  const preview = images.find((img) => img.is_preview) ?? images[0];
  return preview?.url?.trim() ?? null;
}

function InventoryMetricCard({
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

function StockStatusBadge({ stock }: { stock: number | null | undefined }) {
  const level = stockFilterFor(stock);
  if (level === "critical") {
    return (
      <Badge variant="destructive" className="font-normal">
        Out of stock
      </Badge>
    );
  }
  if (level === "low") {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 font-normal text-amber-800"
      >
        Low stock
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700"
    >
      Healthy
    </Badge>
  );
}

function VariantThumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Package aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="size-9 rounded-md border border-border object-cover"
      onError={() => setBroken(true)}
    />
  );
}

function InventoryTableRow({ row }: { row: InventoryWithVariant }) {
  const queryClient = useQueryClient();
  const [savePending, startSave] = useTransition();
  const [stockStr, setStockStr] = useState(String(stockUnits(row.stock)));

  useEffect(() => {
    setStockStr(String(stockUnits(row.stock)));
  }, [row.variant_id, row.stock]);

  const level = stockFilterFor(row.stock);
  const variantLabel = toTitleCase(row.product_variants?.name, "Unnamed variant");
  const productName = toTitleCase(row.product_variants?.products?.name);
  const productId = row.product_variants?.products?.id;
  const previewUrl = previewUrlFromRow(row);

  function saveStock() {
    const parsed = parseInt(stockStr, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setStockStr(String(stockUnits(row.stock)));
      return;
    }
    const next = Math.floor(parsed);
    if (next === stockUnits(row.stock)) return;

    startSave(async () => {
      await overrideStockAction(row.variant_id, next);
      void queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      if (productId) {
        void queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(productId),
        });
      }
    });
  }

  return (
    <TableRow>
      <TableCell>
        <VariantThumb url={previewUrl} />
      </TableCell>
      <TableCell className="max-w-[10rem] font-medium">
        <span className="line-clamp-2">{variantLabel}</span>
      </TableCell>
      <TableCell className="hidden max-w-[12rem] text-muted-foreground md:table-cell">
        <span className="line-clamp-2">{productName}</span>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {formatSku(row.variant_id)}
        </code>
      </TableCell>
      <TableCell>
        <StockStatusBadge stock={row.stock} />
      </TableCell>
      <TableCell>
        <Input
          className={cn(
            "h-7 w-20 tabular-nums",
            level === "critical" && "text-destructive",
            level === "low" && "text-amber-700",
          )}
          type="number"
          min={0}
          step={1}
          value={stockStr}
          onChange={(e) => setStockStr(e.target.value)}
          onBlur={saveStock}
          disabled={savePending}
          aria-label={`Stock for ${variantLabel}`}
        />
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {row.updated_at
          ? format(new Date(row.updated_at), "MMM d, yyyy · h:mm a")
          : "—"}
      </TableCell>
      <TableCell className="text-right">
        {productId ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${variantLabel}`}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  nativeButton={false}
                  render={<Link href={`/admin/products/${productId}`} />}
                >
                  <ExternalLink />
                  View product
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

const FILTER_OPTIONS: { id: StockFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "low", label: "Low" },
  { id: "critical", label: "Critical" },
];

export function InventoryPanel({
  inventory,
  total,
  page,
  stats,
}: {
  inventory: InventoryWithVariant[];
  total: number;
  page: number;
  stats: InventoryCatalogStats;
}) {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((row) => {
      if (stockFilter !== "all" && stockFilterFor(row.stock) !== stockFilter) {
        return false;
      }
      if (!q) return true;
      const variantName = (row.product_variants?.name ?? "").toLowerCase();
      const productName = (row.product_variants?.products?.name ?? "").toLowerCase();
      const sku = formatSku(row.variant_id).toLowerCase();
      return (
        variantName.includes(q) || productName.includes(q) || sku.includes(q)
      );
    });
  }, [inventory, search, stockFilter]);

  const isFiltering = search.trim().length > 0 || stockFilter !== "all";
  const healthyPct =
    stats.totalSkus > 0 ? Math.round((stats.healthySkus / stats.totalSkus) * 100) : 0;

  return (
    <div className={adminPanelStackClass}>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Central inventory
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Variant-level warehouse stock. Override counts when reconciling receipts
            or corrections.
          </p>
        </header>

        <section aria-label="Inventory summary">
          <div className={adminStatGridClass}>
            <InventoryMetricCard
              title="Tracked SKUs"
              value={stats.totalSkus.toLocaleString("en-IN")}
              description="Rows in central inventory"
            />
            <InventoryMetricCard
              title="Healthy (≥10)"
              value={stats.healthySkus.toLocaleString("en-IN")}
              description={`${healthyPct}% of tracked SKUs`}
            />
            <InventoryMetricCard
              title="Low (1–9)"
              value={stats.lowStockSkus.toLocaleString("en-IN")}
              description={
                stats.lowStockSkus > 0 ? "Needs attention soon" : "None flagged"
              }
            />
            <InventoryMetricCard
              title="Critical"
              value={stats.criticalSkus.toLocaleString("en-IN")}
              description={
                stats.criticalSkus > 0 ? "Zero or unset stock" : "None flagged"
              }
            />
          </div>
        </section>

        <Card className="border border-border ring-0">
          <CardHeader className="border-b border-border">
            <CardTitle>Stock ledger</CardTitle>
            <CardDescription>
              {isFiltering
                ? `${filtered.length} of ${inventory.length} rows on this page`
                : `Page ${page + 1} · ${inventory.length} rows shown`}
            </CardDescription>
          </CardHeader>

          <div className="flex flex-col gap-2 border-b border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search variant, product, SKU…"
                className="pl-9"
                aria-label="Search inventory rows"
              />
            </div>

            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter by stock level"
            >
              {FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={stockFilter === option.id ? "secondary" : "outline"}
                  aria-pressed={stockFilter === option.id}
                  onClick={() => setStockFilter(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Warehouse className="size-10 text-muted-foreground/40" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {isFiltering
                  ? "No rows match your filters."
                  : "No inventory records yet."}
              </p>
              {isFiltering ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStockFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <span className="sr-only">Thumbnail</span>
                    </TableHead>
                    <TableHead scope="col">Variant</TableHead>
                    <TableHead scope="col" className="hidden md:table-cell">
                      Product
                    </TableHead>
                    <TableHead scope="col" className="hidden lg:table-cell">
                      SKU
                    </TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Stock</TableHead>
                    <TableHead scope="col" className="hidden sm:table-cell">
                      Updated
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <InventoryTableRow key={row.variant_id} row={row} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}

          {!isFiltering && total > inventory.length ? (
            <CardFooter className="border-t border-border p-0">
              <Pagination total={total} page={page} basePath="/admin/inventory" />
            </CardFooter>
          ) : null}
        </Card>
    </div>
  );
}
