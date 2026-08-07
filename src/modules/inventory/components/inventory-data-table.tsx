"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  ExternalLink,
  MoreHorizontal,
  Package,
  Warehouse,
  X,
} from "lucide-react";

import type { InventoryWithVariant } from "@/common/admin/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { overrideStockAction, updateReorderPointAction } from "@/modules/inventory/actions/inventory.actions";
import {
  formatSku,
  INVENTORY_ACCENT,
  reorderPointFor,
  stockLevelFor,
  stockUnits,
  StockStatusPill,
  toTitleCase,
} from "@/modules/inventory/components/inventory-ui";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

function previewUrlFromRow(row: InventoryWithVariant): string | null {
  const images = row.product_variants?.variant_images ?? [];
  const preview = images.find((img) => img.is_preview) ?? images[0];
  return preview?.url?.trim() ?? null;
}

function exportInventoryCsv(rows: InventoryWithVariant[]) {
  const headers = [
    "Variant",
    "Product",
    "SKU",
    "Status",
    "Stock",
    "Min threshold",
    "Updated",
  ];

  const csvRows = rows.map((row) => [
    toTitleCase(row.product_variants?.name, "Unnamed variant"),
    toTitleCase(row.product_variants?.products?.name),
    formatSku(row.variant_id),
    stockLevelFor(row.stock, row.reorder_point),
    String(stockUnits(row.stock)),
    String(reorderPointFor(row.reorder_point)),
    row.updated_at
      ? format(new Date(row.updated_at), "yyyy-MM-dd HH:mm")
      : "",
  ]);

  const csv = [headers, ...csvRows]
    .map((line) =>
      line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventory-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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

function InventoryTableRow({
  row,
  selected,
  onSelectedChange,
}: {
  row: InventoryWithVariant;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [savePending, startSave] = useTransition();
  const [stockStr, setStockStr] = useState(String(stockUnits(row.stock)));
  const [reorderPointStr, setReorderPointStr] = useState(
    String(reorderPointFor(row.reorder_point)),
  );

  useEffect(() => {
    setStockStr(String(stockUnits(row.stock)));
    setReorderPointStr(String(reorderPointFor(row.reorder_point)));
  }, [row.variant_id, row.stock, row.reorder_point]);

  const level = stockLevelFor(row.stock, row.reorder_point);
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

  function saveReorderPoint() {
    const parsed = parseInt(reorderPointStr, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setReorderPointStr(String(reorderPointFor(row.reorder_point)));
      return;
    }
    const next = Math.floor(parsed);
    if (next === reorderPointFor(row.reorder_point)) return;

    startSave(async () => {
      await updateReorderPointAction(row.variant_id, next);
      void queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
    });
  }

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={cn(
        "border-b border-border/60 hover:bg-muted/40",
        INVENTORY_ACCENT.selectedRow,
      )}
    >
      <TableCell>
        <Checkbox
          aria-label={`Select ${variantLabel}`}
          checked={selected}
          onCheckedChange={(checked) => onSelectedChange(checked === true)}
        />
      </TableCell>
      <TableCell>
        <VariantThumb url={previewUrl} />
      </TableCell>
      <TableCell className="max-w-[10rem] font-medium">
        <span className="line-clamp-2 text-[13px]">{variantLabel}</span>
      </TableCell>
      <TableCell className="hidden max-w-[12rem] text-[13px] text-muted-foreground md:table-cell">
        <span className="line-clamp-2">{productName}</span>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {formatSku(row.variant_id)}
        </code>
      </TableCell>
      <TableCell>
        <StockStatusPill stock={row.stock} reorderPoint={row.reorder_point} />
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
      <TableCell>
        <Input
          className="h-7 w-16 tabular-nums"
          type="number"
          min={0}
          step={1}
          value={reorderPointStr}
          onChange={(e) => setReorderPointStr(e.target.value)}
          onBlur={saveReorderPoint}
          disabled={savePending}
          aria-label={`Min threshold for ${variantLabel}`}
        />
      </TableCell>
      <TableCell className="hidden text-[13px] text-muted-foreground lg:table-cell">
        {row.updated_at
          ? format(new Date(row.updated_at), "MMM d, yyyy")
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
                <DropdownMenuItem onClick={() => exportInventoryCsv([row])}>
                  <Download />
                  Export row
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function InventoryBulkActionBar({
  selectedIds,
  rows,
  onClearSelection,
}: {
  selectedIds: Set<string>;
  rows: InventoryWithVariant[];
  onClearSelection: () => void;
}) {
  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.variant_id)),
    [rows, selectedIds],
  );

  if (selectedIds.size === 0) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 backdrop-blur-sm",
        INVENTORY_ACCENT.selectionBar,
      )}
    >
      <p className="text-sm font-medium">
        {selectedIds.size} SKU{selectedIds.size === 1 ? "" : "s"} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportInventoryCsv(selectedRows)}
        >
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X data-icon="inline-start" />
          Clear
        </Button>
      </div>
    </div>
  );
}

export { exportInventoryCsv };

export function InventoryDataTable({
  rows,
  selectedIds,
  onSelectedIdsChange,
}: {
  rows: InventoryWithVariant[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
}) {
  const pageIds = rows.map((r) => r.variant_id);
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

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Warehouse className="size-10 text-muted-foreground/40" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No inventory records in this view.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/60 hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select all inventory rows on this page"
              checked={allPageSelected}
              onCheckedChange={(checked) => toggleAllOnPage(checked === true)}
            />
          </TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Thumbnail</span>
          </TableHead>
          <TableHead>Variant</TableHead>
          <TableHead className="hidden md:table-cell">Product</TableHead>
          <TableHead className="hidden lg:table-cell">SKU</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead className="min-w-[5rem]">Min threshold</TableHead>
          <TableHead className="hidden text-muted-foreground lg:table-cell">Updated</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <InventoryTableRow
            key={row.variant_id}
            row={row}
            selected={selectedIds.has(row.variant_id)}
            onSelectedChange={(checked) => toggleRow(row.variant_id, checked)}
          />
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
