"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { ErpSalesVariantSearchRow, SalesLineFormRow } from "@/common/erp/sales-types";
import { calcSalesLine, roundSalesMoney } from "@/common/erp/sales-types";
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

export function emptySalesLine(): SalesLineFormRow {
  return {
    key: newLineKey(),
    variantId: null,
    productName: "",
    description: "",
    barcode: "",
    quantity: 1,
    unitPrice: 0,
    taxRatePercent: 0,
    unitId: null,
  };
}

export function salesLinesToApiInput(lines: SalesLineFormRow[]) {
  return lines
    .filter((l) => l.productName.trim() && l.quantity > 0)
    .map((l) => ({
      variantId: l.variantId,
      productName: l.productName,
      description: l.description || null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRatePercent: l.taxRatePercent,
      unitId: l.unitId,
    }));
}

export function SalesLinesEditor({
  lines,
  onChange,
  storeId,
  taxInclusive = false,
  showSerial = false,
}: {
  lines: SalesLineFormRow[];
  onChange: (lines: SalesLineFormRow[]) => void;
  storeId?: string;
  taxInclusive?: boolean;
  showSerial?: boolean;
}) {
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of lines) {
      const { taxable, taxAmount } = calcSalesLine(
        line.quantity,
        line.unitPrice,
        line.taxRatePercent,
        taxInclusive,
      );
      subtotal += taxable;
      tax += taxAmount;
    }
    return {
      subtotal: roundSalesMoney(subtotal),
      tax: roundSalesMoney(tax),
      total: roundSalesMoney(subtotal + tax),
    };
  }, [lines, taxInclusive]);

  function addFromSearch(row: ErpSalesVariantSearchRow) {
    onChange([
      ...lines.filter((l) => l.productName.trim()),
      {
        key: newLineKey(),
        variantId: row.id,
        productName: row.name
          ? `${row.product_name} — ${row.name}`
          : row.product_name,
        description: "",
        barcode: row.barcode ?? "",
        quantity: 1,
        unitPrice: row.sales_price ?? 0,
        taxRatePercent: row.tax_rate_percent ?? 0,
        unitId: null,
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<SalesLineFormRow>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    onChange(lines.filter((l) => l.key !== key));
  }

  return (
    <div className="space-y-4">
      <ProductLiveSearch
        catalog="sales"
        storeId={storeId}
        placeholder="Search product by name or barcode…"
        className="max-w-md"
        onSelect={(row) => addFromSearch(row as ErpSalesVariantSearchRow)}
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {showSerial ? <TableHead className="w-10">#</TableHead> : null}
              <TableHead>Item</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-28">Rate</TableHead>
              <TableHead className="w-20">Tax %</TableHead>
              <TableHead className="w-28 text-right">Tax amount</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const { taxAmount, total } = calcSalesLine(
                line.quantity,
                line.unitPrice,
                line.taxRatePercent,
                taxInclusive,
              );
              return (
                <TableRow key={line.key}>
                  {showSerial ? <TableCell className="text-muted-foreground">{index + 1}</TableCell> : null}
                  <TableCell>
                    <Input
                      value={line.productName}
                      onChange={(e) => updateLine(line.key, { productName: e.target.value })}
                      placeholder="Product name"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(line.key, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.taxRatePercent}
                      onChange={(e) =>
                        updateLine(line.key, {
                          taxRatePercent: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrencyAmount(taxAmount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrencyAmount(total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLine(line.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...lines, emptySalesLine()])}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add line
        </Button>
      </div>

      <div className="flex justify-end gap-6 text-sm">
        <span>
          Subtotal: <strong>{formatCurrencyAmount(totals.subtotal)}</strong>
        </span>
        <span>
          Tax: <strong>{formatCurrencyAmount(totals.tax)}</strong>
        </span>
        <span>
          Total: <strong>{formatCurrencyAmount(totals.total)}</strong>
        </span>
      </div>
    </div>
  );
}
