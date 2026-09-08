"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import type { LineProductContext } from "@/common/erp/line-product-context";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

function formatStock(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return formatCurrencyAmount(value);
}

function MetricBlock({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-[130px] flex-1">
      <div className="rounded-md bg-muted/80 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-muted-foreground">
        {label}
      </div>
      <p
        className={cn(
          "mt-1.5 px-0.5 text-sm tabular-nums",
          emphasize ? "font-semibold text-foreground" : "text-foreground/90",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function LineProductDetailsToggle({
  open,
  onToggle,
  disabled,
  disabledReason,
}: {
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 text-xs"
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      onClick={onToggle}
    >
      {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      {open ? "Hide" : "Details"}
    </Button>
  );
}

export function LineProductDetailsPanel({
  productId,
  storeId,
  customerId,
  vendorId,
  counterpartyKind = "customer",
  enabled = true,
}: {
  productId: string;
  storeId?: string;
  customerId?: string;
  vendorId?: string;
  counterpartyKind?: "customer" | "vendor";
  enabled?: boolean;
}) {
  const counterpartyId = counterpartyKind === "customer" ? customerId : vendorId;

  const { data, isPending, isError } = useQuery({
    queryKey: [
      "admin",
      "line-product-context",
      storeId,
      productId,
      customerId ?? "",
      vendorId ?? "",
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId: storeId ?? "",
        productIds: productId,
      });
      if (customerId) params.set("customerId", customerId);
      if (vendorId) params.set("vendorId", vendorId);
      const res = await adminGet<{ data: Record<string, LineProductContext> }>(
        `erp/line-product-context?${params.toString()}`,
      );
      return res.data[productId] ?? null;
    },
    enabled: enabled && Boolean(storeId && productId && counterpartyId),
    staleTime: 30_000,
  });

  if (!storeId || !productId || !counterpartyId) {
    return (
      <p className="text-xs text-muted-foreground">
        Select {counterpartyKind === "customer" ? "a customer" : "a vendor"} and link a
        catalog product to view details.
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading product context…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-xs text-muted-foreground">
        Could not load product details for this line.
      </p>
    );
  }

  const counterpartyLabel =
    counterpartyKind === "customer"
      ? "Last selling price (this customer)"
      : "Last purchase price (this vendor)";

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
      <MetricBlock
        label="Available stock (in store)"
        value={formatStock(data.availableStock)}
        emphasize
      />
      <MetricBlock
        label="Avg purchase price"
        value={formatPrice(data.avgPurchasePrice)}
      />
      <MetricBlock
        label="Last purchase price"
        value={formatPrice(data.lastPurchasePrice)}
      />
      <MetricBlock
        label="Last selling price"
        value={formatPrice(data.lastSellingPrice)}
      />
      <MetricBlock
        label={counterpartyLabel}
        value={formatPrice(data.counterpartyLastPrice)}
      />
    </div>
  );
}
