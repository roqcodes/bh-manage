"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { useDebouncedValue } from "@/modules/admin/ui/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/format-currency";

export type EntitySearchOption = {
  id: string;
  label: string;
  sublabel?: string;
  meta?: string;
  amount?: number;
};

type EntitySearchSelectProps = {
  value: string | null;
  onChange: (id: string | null, option?: EntitySearchOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  fetchOptions: (query: string) => Promise<EntitySearchOption[]>;
  selectedLabel?: string;
  minChars?: number;
  loadOnFocus?: boolean;
};

export function EntitySearchSelect({
  value,
  onChange,
  placeholder = "Search and select…",
  searchPlaceholder = "Type to search…",
  emptyText = "No results",
  disabled,
  className,
  fetchOptions,
  selectedLabel,
  minChars = 1,
  loadOnFocus = true,
}: EntitySearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<EntitySearchOption[]>([]);
  const debouncedQuery = useDebouncedValue(query, 250);

  const displayValue = useMemo(() => {
    if (open) return query;
    if (selectedLabel) return selectedLabel;
    const match = options.find((o) => o.id === value);
    return match?.label ?? "";
  }, [open, query, selectedLabel, options, value]);

  useEffect(() => {
    if (!open) return;
    const q = debouncedQuery.trim();
    if (!loadOnFocus && q.length < minChars) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchOptions(q)
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, fetchOptions, minChars, loadOnFocus]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={displayValue}
          disabled={disabled}
          placeholder={value && !open ? placeholder : searchPlaceholder}
          className="h-10 pr-9 pl-9"
          onFocus={() => {
            setOpen(true);
            if (!query && selectedLabel) setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => {
              onChange(null);
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear selection"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : debouncedQuery.trim().length < minChars && !loadOnFocus ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Type at least {minChars} characters
            </p>
          ) : options.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option.id, option);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-muted",
                  value === option.id && "bg-primary/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{option.label}</p>
                  {option.sublabel ? (
                    <p className="truncate text-xs text-muted-foreground">{option.sublabel}</p>
                  ) : null}
                  {option.meta ? (
                    <p className="truncate text-[11px] text-muted-foreground/80">{option.meta}</p>
                  ) : null}
                </div>
                {option.amount != null ? (
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {formatCurrencyAmount(option.amount)}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CustomerSearchSelect({
  value,
  onChange,
  selectedLabel,
  className,
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null, option?: EntitySearchOption) => void;
  selectedLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <EntitySearchSelect
      value={value}
      onChange={onChange}
      selectedLabel={selectedLabel}
      className={className}
      disabled={disabled}
      placeholder="Select customer"
      searchPlaceholder="Search name, email, phone…"
      emptyText="No customers found"
      minChars={1}
      loadOnFocus
      fetchOptions={async (q) => {
        const res = await adminGet<{
          data: Array<{
            id: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            customer_number: string | null;
          }>;
        }>(`customers?view=search&q=${encodeURIComponent(q)}`);
        return (res.data ?? []).map((c) => ({
          id: c.id,
          label: c.name?.trim() || c.email || c.phone || "Unnamed customer",
          sublabel: [c.email, c.phone].filter(Boolean).join(" · ") || undefined,
          meta: c.customer_number ? `Customer #${c.customer_number}` : undefined,
        }));
      }}
    />
  );
}

export function VendorSearchSelect({
  value,
  onChange,
  selectedLabel,
  className,
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null, option?: EntitySearchOption) => void;
  selectedLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <EntitySearchSelect
      value={value}
      onChange={onChange}
      selectedLabel={selectedLabel}
      className={className}
      disabled={disabled}
      placeholder="Select vendor"
      searchPlaceholder="Search vendor name…"
      emptyText="No vendors found"
      minChars={1}
      loadOnFocus
      fetchOptions={async (q) => {
        const res = await adminGet<{
          data: Array<{ id: string; name: string | null }>;
        }>(`vendors?view=search&q=${encodeURIComponent(q)}`);
        return (res.data ?? []).map((v) => ({
          id: v.id,
          label: v.name ?? "Unnamed vendor",
        }));
      }}
    />
  );
}

export function ProductSearchSelect({
  value,
  onChange,
  storeId,
  selectedLabel,
  className,
  disabled,
  onPick,
}: {
  value: string | null;
  onChange: (id: string | null, option?: EntitySearchOption) => void;
  storeId?: string;
  selectedLabel?: string;
  className?: string;
  disabled?: boolean;
  onPick?: (option: EntitySearchOption & { variantId: string; unitPrice: number }) => void;
}) {
  return (
    <EntitySearchSelect
      value={value}
      onChange={(id, option) => {
        onChange(id, option);
        if (id && option && onPick) {
          const parts = option.meta?.split("|") ?? [];
          onPick({
            ...option,
            variantId: id,
            unitPrice: Number(parts[0] ?? 0),
          });
        }
      }}
      selectedLabel={selectedLabel}
      className={className}
      disabled={disabled}
      placeholder="Search product or barcode"
      searchPlaceholder="Name, SKU, barcode…"
      emptyText="No products found"
      minChars={1}
      loadOnFocus={Boolean(storeId)}
      fetchOptions={async (q) => {
        const params = new URLSearchParams({ q });
        if (storeId) params.set("storeId", storeId);
        const res = await adminGet<{
          data: Array<{
            id: string;
            product_name: string;
            name: string | null;
            barcode: string | null;
            sales_price: number | null;
            available_stock: number;
          }>;
        }>(`erp/sales-catalog?${params.toString()}`);
        return (res.data ?? []).map((row) => ({
          id: row.id,
          label: row.name ? `${row.product_name} — ${row.name}` : row.product_name,
          sublabel: row.barcode ? `Barcode: ${row.barcode}` : undefined,
          meta: `${row.sales_price ?? 0}|stock:${row.available_stock}`,
          amount: row.sales_price ?? 0,
        }));
      }}
    />
  );
}

export function InvoiceSearchSelect({
  value,
  onChange,
  selectedLabel,
  className,
  disabled,
  openOnly,
  storeId,
}: {
  value: string | null;
  onChange: (id: string | null, option?: EntitySearchOption) => void;
  selectedLabel?: string;
  className?: string;
  disabled?: boolean;
  openOnly?: boolean;
  storeId?: string;
}) {
  return (
    <EntitySearchSelect
      value={value}
      onChange={onChange}
      selectedLabel={selectedLabel}
      className={className}
      disabled={disabled}
      placeholder="Select invoice"
      searchPlaceholder="Invoice number or customer…"
      emptyText="No invoices found"
      minChars={1}
      loadOnFocus
      fetchOptions={async (q) => {
        const params = new URLSearchParams({ search: q, page: "0", limit: "15" });
        if (openOnly) params.set("openOnly", "1");
        if (storeId) params.set("storeId", storeId);
        const res = await adminGet<{
          data: Array<{
            id: string;
            invoice_number: string;
            customer_name: string | null;
            total_amount: number;
            balance_due: number;
            status: string;
            created_at: string;
          }>;
        }>(`erp/invoices?${params.toString()}`);
        return (res.data ?? []).map((inv) => ({
          id: inv.id,
          label: inv.invoice_number,
          sublabel: inv.customer_name ?? undefined,
          meta: `${inv.status} · ${inv.created_at?.slice(0, 10) ?? ""}`,
          amount: inv.balance_due > 0 ? inv.balance_due : inv.total_amount,
        }));
      }}
    />
  );
}

export function PurchaseBillSearchSelect({
  value,
  onChange,
  selectedLabel,
  className,
  disabled,
  vendorId,
  storeId,
}: {
  value: string | null;
  onChange: (id: string | null, option?: EntitySearchOption) => void;
  selectedLabel?: string;
  className?: string;
  disabled?: boolean;
  vendorId?: string;
  storeId?: string;
}) {
  return (
    <EntitySearchSelect
      value={value}
      onChange={onChange}
      selectedLabel={selectedLabel}
      className={className}
      disabled={disabled}
      placeholder="Select purchase bill"
      searchPlaceholder="Bill number or vendor bill #…"
      emptyText="No purchase bills found"
      minChars={1}
      loadOnFocus={Boolean(vendorId)}
      fetchOptions={async (q) => {
        const params = new URLSearchParams({ page: "0", limit: "20" });
        if (q.trim()) params.set("search", q.trim());
        if (vendorId) params.set("vendorId", vendorId);
        if (storeId) params.set("storeId", storeId);
        const res = await adminGet<{
          data: Array<{
            id: string;
            purchase_bill_number: string;
            vendor_name: string | null;
            balance_due: number;
            total_amount: number;
            purchase_date: string;
          }>;
        }>(`erp/purchase-bills?${params.toString()}`);
        return (res.data ?? []).map((bill) => ({
          id: bill.id,
          label: bill.purchase_bill_number,
          sublabel: bill.vendor_name ?? undefined,
          meta: bill.purchase_date,
          amount: bill.balance_due > 0 ? bill.balance_due : bill.total_amount,
        }));
      }}
    />
  );
}
