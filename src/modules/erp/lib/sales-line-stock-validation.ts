import type { LineProductContextMap } from "@/common/erp/line-product-context";
import type { SalesLineFormRow } from "@/common/erp/sales-types";

/** Client-side pre-check before issuing sales docs that deduct store stock. */
export function validateSalesLinesStoreStock(
  lines: SalesLineFormRow[],
  context: LineProductContextMap,
): string | null {
  const byProduct = new Map<string, { name: string; qty: number }>();

  for (const line of lines) {
    if (!line.productId || line.quantity <= 0 || !line.productName.trim()) continue;
    const existing = byProduct.get(line.productId);
    if (existing) {
      existing.qty += line.quantity;
    } else {
      byProduct.set(line.productId, {
        name: line.productName.trim(),
        qty: line.quantity,
      });
    }
  }

  for (const [productId, { name, qty }] of byProduct) {
    const available = context[productId]?.availableStock ?? 0;
    if (qty > available) {
      return `Insufficient stock for ${name} (available ${formatQty(available)}, requested ${formatQty(qty)})`;
    }
  }

  const missingProduct = lines.find(
    (line) => line.productName.trim() && line.quantity > 0 && !line.productId,
  );
  if (missingProduct) {
    return `Select a product from search for "${missingProduct.productName.trim()}" so stock can be validated.`;
  }

  return null;
}

function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
