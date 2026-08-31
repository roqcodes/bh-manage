"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";

import type { ErpVariantSearchRow } from "@/common/erp/purchasing-types";
import { adminGet, adminPost } from "@/modules/admin/lib/admin-api-client";
import {
  AdminFormColumns,
  AdminFormField,
  AdminFormGrid,
  AdminFormSection,
  AdminFormShell,
  type ErpFormViewBaseProps,
} from "@/modules/admin/ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoreSelect, useErpStores } from "@/modules/erp/components/use-erp-stores";
import { formatCurrencyAmount } from "@/lib/format-currency";

type AdjLine = {
  key: string;
  variantId: string;
  productName: string;
  direction: "add" | "remove";
  quantity: number;
  purchaseCost: number;
};

function newKey() {
  return `adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export type StockAdjustmentFormViewProps = ErpFormViewBaseProps;

export function StockAdjustmentFormView({
  variant = "page",
  open = true,
  onOpenChange,
  onSuccess,
}: StockAdjustmentFormViewProps) {
  const router = useRouter();
  const { stores, activeStoreId } = useErpStores();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isModal = variant === "modal";

  const [storeId, setStoreId] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<AdjLine[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ErpVariantSearchRow[]>([]);

  useEffect(() => {
    if (activeStoreId && !storeId) setStoreId(activeStoreId);
  }, [activeStoreId, storeId]);

  function handleCancel() {
    if (isModal) {
      onOpenChange?.(false);
    } else {
      router.push("/admin/erp/stock-adjustments");
    }
  }

  function handleSuccessNavigate(id: string) {
    if (isModal) {
      onOpenChange?.(false);
      onSuccess?.(id);
      return;
    }
    router.push(`/admin/erp/stock-adjustments/${id}`);
  }

  async function runSearch() {
    const q = search.trim();
    if (q.length < 2) return;
    const res = await adminGet<{ data: ErpVariantSearchRow[] }>(
      `erp/purchase-catalog?q=${encodeURIComponent(q)}`,
    );
    setResults(res.data);
  }

  function addLine(row: ErpVariantSearchRow, direction: "add" | "remove") {
    setLines([
      ...lines,
      {
        key: newKey(),
        variantId: row.id,
        productName: row.product_name,
        direction,
        quantity: 1,
        purchaseCost: row.purchase_price ?? 0,
      },
    ]);
    setResults([]);
    setSearch("");
  }

  function handleSubmit(finalize: boolean) {
    setError(null);
    if (!storeId) {
      setError("Store is required");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one item");
      return;
    }
    for (const line of lines) {
      if (line.direction === "add" && (!line.purchaseCost || line.purchaseCost <= 0)) {
        setError(`Purchase cost is required when adding stock (${line.productName})`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await adminPost<{ id: string }>("erp/stock-adjustments", {
          storeId,
          adjustmentDate,
          note: note || undefined,
          finalize,
          lines: lines.map((l) => ({
            variantId: l.variantId,
            direction: l.direction,
            quantity: l.quantity,
            purchaseCost: l.direction === "remove" ? 0 : l.purchaseCost,
          })),
        });
        handleSuccessNavigate(res.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  if (isModal && !open) return null;

  const title = "New stock adjustment";
  const footer = isModal ? (
    <>
      <Button type="button" variant="outline" onClick={handleCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={pending} onClick={() => handleSubmit(false)}>
        Save draft
      </Button>
      <Button type="button" disabled={pending} onClick={() => handleSubmit(true)}>
        {pending ? "Saving…" : "Save & finalize"}
      </Button>
    </>
  ) : undefined;

  const sections = (
    <AdminFormColumns cols={2}>
      <AdminFormSection title="Adjustment details">
        <AdminFormGrid cols={2}>
          <AdminFormField label="Store" required>
            <StoreSelect value={storeId} onChange={setStoreId} stores={stores} label="" />
          </AdminFormField>
          <AdminFormField label="Date">
            <Input
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
            />
          </AdminFormField>
          <AdminFormField label="Note" className="sm:col-span-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </AdminFormField>
        </AdminFormGrid>
      </AdminFormSection>

      <AdminFormSection title="Items">
        <div className="flex gap-2">
          <Input
            placeholder="Search product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
          />
          <Button type="button" variant="outline" onClick={runSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {results.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded border p-2 text-sm"
          >
            <span>
              {r.product_name} {r.barcode ? `(${r.barcode})` : ""}
            </span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => addLine(r, "add")}>
                Stock add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addLine(r, "remove")}
              >
                Stock remove
              </Button>
            </div>
          </div>
        ))}

        {lines.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Direction</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-t">
                    <td className="px-3 py-2">{line.productName}</td>
                    <td className="px-3 py-2 capitalize">{line.direction}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          setLines(
                            lines.map((l) =>
                              l.key === line.key
                                ? { ...l, quantity: parseFloat(e.target.value) || 0 }
                                : l,
                            ),
                          )
                        }
                        className="w-20"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {line.direction === "add" ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.purchaseCost}
                          onChange={(e) =>
                            setLines(
                              lines.map((l) =>
                                l.key === line.key
                                  ? { ...l, purchaseCost: parseFloat(e.target.value) || 0 }
                                  : l,
                              ),
                            )
                          }
                          className="w-24"
                          required
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {line.direction === "add"
                        ? formatCurrencyAmount(line.quantity * line.purchaseCost)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setLines(lines.filter((l) => l.key !== line.key))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminFormSection>
    </AdminFormColumns>
  );

  return (
    <AdminFormShell
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Add or remove inventory with optional purchase cost for stock increases."
      backHref="/admin/erp/stock-adjustments"
      breadcrumb={[
        { label: "Stock adjustments", href: "/admin/erp/stock-adjustments" },
        { label: title },
      ]}
      size="landscape"
      footer={footer}
    >
      <div className="space-y-4">
        {sections}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!isModal ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/admin/erp/stock-adjustments"
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button type="button" disabled={pending} onClick={() => handleSubmit(false)}>
              Save draft
            </Button>
            <Button type="button" disabled={pending} onClick={() => handleSubmit(true)}>
              {pending ? "Saving…" : "Save & finalize"}
            </Button>
          </div>
        ) : null}
      </div>
    </AdminFormShell>
  );
}
