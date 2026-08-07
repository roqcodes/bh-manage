"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Copy,
  Download,
  MoreHorizontal,
  Package,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import type { ProductWithCategoryListItem } from "@/common/admin/types";
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
import { cn } from "@/lib/utils";
import {
  bulkDeleteProductsAction,
  bulkSetProductsActiveAction,
  deleteProductAction,
  toggleProductAction,
} from "@/modules/products/actions/products.actions";
import {
  formatProductPrice,
  formatSkuLabel,
  ProductStatusBadge,
  StockBadge,
} from "@/modules/products/components/products-ui";

function ProductThumbnail({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url?.trim() ?? "";

  if (!trimmed || failed) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
        <Package />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt=""
      className="size-10 shrink-0 rounded-md border border-border object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function exportProductsCsv(products: ProductWithCategoryListItem[]) {
  const headers = [
    "Name",
    "SKU",
    "Status",
    "Stock",
    "Category",
    "Price (INR)",
    "MRP (INR)",
  ];

  const rows = products.map((p) => [
    p.name ?? "",
    formatSkuLabel(p),
    p.is_active ? "Active" : "Draft",
    String(p.stock_total),
    p.categories?.name ?? "Uncategorized",
    p.price_min != null ? String(p.price_min) : "",
    p.mrp_min != null ? String(p.mrp_min) : "",
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
  link.download = `products-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProductsBulkActionBar({
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
        {selectedIds.size} product{selectedIds.size === 1 ? "" : "s"} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await bulkSetProductsActiveAction(ids, true);
              void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
              onClearSelection();
            });
          }}
        >
          Set as Active
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await bulkSetProductsActiveAction(ids, false);
              void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
              onClearSelection();
            });
          }}
        >
          Set as Draft
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await bulkDeleteProductsAction(ids);
              void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
              onClearSelection();
            });
          }}
        >
          <Trash2 data-icon="inline-start" />
          Delete selected
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X data-icon="inline-start" />
          Clear
        </Button>
      </div>
    </div>
  );
}

export function ProductsDataTable({
  products,
  selectedIds,
  onSelectedIdsChange,
  onEdit,
}: {
  products: ProductWithCategoryListItem[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onEdit: (product: ProductWithCategoryListItem) => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const pageIds = products.map((p) => p.id);
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

  function runToggle(productId: string, isActive: boolean) {
    startTransition(async () => {
      await toggleProductAction(productId, isActive);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  function runDelete(productId: string) {
    startTransition(async () => {
      await deleteProductAction(productId);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Package className="size-10 text-muted-foreground/40" aria-hidden />
        <p className="text-sm text-muted-foreground">No products in this view.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/60 hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select all products on this page"
              checked={allPageSelected}
              onCheckedChange={(checked) => toggleAllOnPage(checked === true)}
            />
          </TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">MRP</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isSelected = selectedIds.has(product.id);

          return (
            <TableRow
              key={product.id}
              data-state={isSelected ? "selected" : undefined}
              className="border-b border-border/60 hover:bg-muted/40 data-[state=selected]:bg-accent/60"
            >
              <TableCell>
                <Checkbox
                  aria-label={`Select ${product.name ?? "product"}`}
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    toggleRow(product.id, checked === true)
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <ProductThumbnail url={product.image_url} />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-[13px] font-medium leading-snug text-foreground hover:text-primary hover:underline"
                    >
                      {product.name ?? "Untitled product"}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatSkuLabel(product)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <ProductStatusBadge product={product} />
              </TableCell>
              <TableCell>
                <StockBadge stock={product.stock_total} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {product.categories?.name ?? "Uncategorized"}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {formatProductPrice(product.price_min)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {formatProductPrice(product.mrp_min)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => onEdit(product)}
                  >
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Product actions"
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Pencil />
                          Edit product
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          nativeButton={false}
                          render={<Link href={`/admin/products/${product.id}`} />}
                        >
                          <Copy />
                          View / duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isPending}
                          onClick={() =>
                            runToggle(product.id, product.is_active !== true)
                          }
                        >
                          <Archive />
                          {product.is_active ? "Archive" : "Set active"}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => runDelete(product.id)}
                        >
                          <Trash2 />
                          Delete
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
