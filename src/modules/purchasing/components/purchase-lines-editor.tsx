"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { PurchaseLineFormRow } from "@/common/erp/purchasing-types";
import { calcPurchaseLine, roundMoney } from "@/common/erp/purchasing-types";
import type { ErpVariantSearchRow } from "@/common/erp/purchasing-types";
import { ProductLiveSearch } from "@/modules/admin/ui/product-live-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyAmount } from "@/lib/format-currency";

function newLineKey() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyPurchaseLine(): PurchaseLineFormRow {
  return {
    key: newLineKey(),
    variantId: null,
    productName: "",
    barcode: "",
    expiryDate: "",
    quantity: 1,
    purchasePrice: 0,
    taxRatePercent: 0,
  };
}

export function PurchaseLinesEditor({
  lines,
  onChange,
  showExpiry = false,
  showSerial = false,
}: {
  lines: PurchaseLineFormRow[];
  onChange: (lines: PurchaseLineFormRow[]) => void;
  showExpiry?: boolean;
  showSerial?: boolean;
}) {
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of lines) {
      const { taxable, taxAmount } = calcPurchaseLine(
        line.quantity,
        line.purchasePrice,
        line.taxRatePercent,
      );
      subtotal += taxable;
      tax += taxAmount;
    }
    return { subtotal: roundMoney(subtotal), tax: roundMoney(tax), total: roundMoney(subtotal + tax) };
  }, [lines]);

  function addVariant(v: ErpVariantSearchRow) {
    const label = v.name ? `${v.product_name} — ${v.name}` : v.product_name;
    onChange([
      ...lines,
      {
        key: newLineKey(),
        variantId: v.id,
        productName: label,
        barcode: v.barcode ?? "",
        expiryDate: "",
        quantity: 1,
        purchasePrice: v.purchase_price ?? 0,
        taxRatePercent: v.tax_rate_percent ?? 0,
      },
    ]);
  }

  function updateLine(index: number, patch: Partial<PurchaseLineFormRow>) {
    const next = [...lines];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[240px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Search product / variant</label>
          <ProductLiveSearch
            catalog="purchase"
            placeholder="Name, barcode, code…"
            onSelect={(row) => addVariant(row as ErpVariantSearchRow)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => onChange([...lines, emptyPurchaseLine()])}>
          <Plus className="size-4" />
          Add line
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              {showSerial ? <TableHead className="w-10">Sl#</TableHead> : null}
              <TableHead>Item name</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Tax %</TableHead>
              {showExpiry ? <TableHead>Expiry</TableHead> : null}
              <TableHead className="text-right">Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const { lineTotal } = calcPurchaseLine(
                line.quantity,
                line.purchasePrice,
                line.taxRatePercent,
              );
              return (
                <TableRow key={line.key}>
                  {showSerial ? (
                    <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  ) : null}
                  <TableCell className="min-w-[200px]">
                    <Input
                      value={line.productName}
                      onChange={(e) => updateLine(index, { productName: e.target.value })}
                      placeholder="Product name"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-20"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-24"
                      value={line.purchasePrice}
                      onChange={(e) =>
                        updateLine(index, { purchasePrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-20"
                      value={line.taxRatePercent}
                      onChange={(e) =>
                        updateLine(index, { taxRatePercent: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  {showExpiry ? (
                    <TableCell>
                      <Input
                        type="date"
                        value={line.expiryDate}
                        onChange={(e) => updateLine(index, { expiryDate: e.target.value })}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right tabular-nums">
                    {formatCurrencyAmount(lineTotal)}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-end gap-1 border-t pt-3 text-sm">
        <div className="flex w-full max-w-xs justify-between gap-8 text-muted-foreground">
          <span>Sub total</span>
          <span className="tabular-nums">{formatCurrencyAmount(totals.subtotal)}</span>
        </div>
        <div className="flex w-full max-w-xs justify-between gap-8 text-muted-foreground">
          <span>Tax</span>
          <span className="tabular-nums">{formatCurrencyAmount(totals.tax)}</span>
        </div>
        <div className="flex w-full max-w-xs justify-between gap-8 font-semibold text-foreground">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrencyAmount(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}

export function linesToApiInput(lines: PurchaseLineFormRow[]) {
  return lines
    .filter((l) => l.productName.trim() && l.quantity > 0)
    .map((l) => ({
      variantId: l.variantId,
      productName: l.productName.trim(),
      barcode: l.barcode || null,
      expiryDate: l.expiryDate || null,
      quantity: l.quantity,
      purchasePrice: l.purchasePrice,
      taxRatePercent: l.taxRatePercent,
    }));
}
