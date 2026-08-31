"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, ChevronDown, Columns3, Search } from "lucide-react";

import type {
  AdminPurchaseOrderListRow,
  PurchaseOrderCatalogStats,
  PurchaseOrderStatusFilter,
  Vendor,
} from "@/common/admin/types";
import { Pagination } from "@/modules/admin/components/pagination";
import {
  exportPurchaseOrdersCsv,
  PurchaseOrdersBulkActionBar,
  PurchaseOrdersDataTable,
} from "@/modules/purchase-orders/components/purchase-orders-data-table";
import { PurchaseOrdersMetricsBar } from "@/modules/purchase-orders/components/purchase-orders-metrics-bar";
import Link from "next/link";
import {
  matchesPoViewFilter,
  PO_ACCENT,
  PURCHASE_ORDERS_VIEW_FILTERS,
  shortPoRef,
  type PurchaseOrdersViewFilter,
} from "@/modules/purchase-orders/components/purchase-orders-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export function AdminPurchaseOrdersPanel({
  orders,
  total,
  page,
  statusFilter,
  filterVendors: _filterVendors,
  selectedVendorId,
  stats,
}: {
  orders: AdminPurchaseOrderListRow[];
  total: number;
  page: number;
  statusFilter: PurchaseOrderStatusFilter;
  filterVendors: Pick<Vendor, "id" | "name">[];
  selectedVendorId: string | null;
  stats: PurchaseOrderCatalogStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<PurchaseOrdersViewFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const listParams: Record<string, string> = {};
  if (statusFilter !== "all") listParams.status = statusFilter;
  if (selectedVendorId) listParams.vendorId = selectedVendorId;

  function handleVendorFilter(vendorId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (vendorId) params.set("vendorId", vendorId);
    else params.delete("vendorId");
    params.delete("page");
    router.push(`/admin/purchase-orders?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((po) => {
      if (!matchesPoViewFilter(po, viewFilter)) return false;

      if (!q) return true;

      const idMatch = po.id.toLowerCase().includes(q);
      const refMatch = shortPoRef(po.id).toLowerCase().includes(q);
      const vendorName = (po.vendors?.name ?? "").toLowerCase();
      const vendorId = (po.vendor_id ?? "").toLowerCase();
      return (
        idMatch ||
        refMatch ||
        vendorName.includes(q) ||
        vendorId.includes(q)
      );
    });
  }, [orders, search, viewFilter]);

  const isFiltering = search.trim().length > 0 || viewFilter !== "all";

  const activeFilterLabel =
    PURCHASE_ORDERS_VIEW_FILTERS.find((f) => f.id === viewFilter)?.label ??
    "All";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h1 className="text-lg font-semibold">Purchase orders</h1>
        <Link href="/admin/purchase-orders?form=new" className={buttonVariants()}>
          Create purchase order
        </Link>
      </div>

      <PurchaseOrdersMetricsBar
        stats={stats}
        onExport={() => exportPurchaseOrdersCsv(filtered)}
      />

      <Card className="overflow-hidden border border-border py-0 ring-0">
        <CardContent className="flex flex-col gap-0 p-0">
          <div className="border-b p-2">
            <InputGroup className="h-9">
              <InputGroupAddon align="inline-start" className="pl-1">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <InputGroupButton
                        variant="ghost"
                        size="sm"
                        className={cn("gap-1 px-2", PO_ACCENT.focus)}
                      />
                    }
                  >
                    {activeFilterLabel}
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      {PURCHASE_ORDERS_VIEW_FILTERS.map((option) => (
                        <DropdownMenuItem
                          key={option.id}
                          onClick={() => setViewFilter(option.id)}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </InputGroupAddon>
              <InputGroupAddon align="inline-start" className="px-0">
                <div className="h-4 w-px bg-border" aria-hidden />
              </InputGroupAddon>
              <InputGroupAddon align="inline-start">
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search and filter..."
                className="border-0"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Column view"
                  className={PO_ACCENT.focus}
                >
                  <Columns3 />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="px-2 pt-2">
            <PurchaseOrdersBulkActionBar
              selectedIds={selectedIds}
              orders={filtered}
              onClearSelection={() => setSelectedIds(new Set())}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Ban className="size-12 text-muted-foreground/30" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {isFiltering
                  ? "No purchase orders match your filters on this page."
                  : "No purchase orders in this view."}
              </p>
              {isFiltering ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setViewFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <PurchaseOrdersDataTable
              orders={filtered}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          )}

          <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              {isFiltering
                ? `${filtered.length} of ${orders.length} on this page`
                : `Page ${page + 1} · ${total.toLocaleString("en-IN")} matching`}
            </span>
            {selectedVendorId ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleVendorFilter(null)}
              >
                Clear vendor filter
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!isFiltering && total > orders.length ? (
        <Pagination
          total={total}
          page={page}
          basePath="/admin/purchase-orders"
          extraParams={listParams}
        />
      ) : null}
    </div>
  );
}
