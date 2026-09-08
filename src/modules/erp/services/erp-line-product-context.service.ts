import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { LineProductContext, LineProductContextMap } from "@/common/erp/line-product-context";
import { resolveErpStoreId } from "@/modules/erp/services/store-context.service";

function latestPriceByProduct(
  rows: { productId: string; price: number; at: string }[],
): Map<string, number> {
  const map = new Map<string, number>();
  const sorted = [...rows].sort((a, b) => b.at.localeCompare(a.at));
  for (const row of sorted) {
    if (!map.has(row.productId)) {
      map.set(row.productId, row.price);
    }
  }
  return map;
}

/** Context panel data for purchase/sales line items (per product). */
export async function getLineProductContext(input: {
  storeId?: string;
  productIds: string[];
  customerId?: string;
  vendorId?: string;
}): Promise<LineProductContextMap> {
  await requireAdminOrManagerProfile();
  const productIds = [...new Set(input.productIds.filter(Boolean))];
  if (productIds.length === 0) return {};

  const storeId = await resolveErpStoreId(input.storeId);
  if (!storeId) return {};

  const supabase = await createSupabaseServerClient();
  const result: LineProductContextMap = {};

  for (const productId of productIds) {
    result[productId] = {
      productId,
      availableStock: 0,
      avgPurchasePrice: null,
      lastPurchasePrice: null,
      lastSellingPrice: null,
      counterpartyLastPrice: null,
    };
  }

  const { data: spiRows } = await supabase
    .from("store_product_inventory")
    .select("product_id, stock, purchase_price")
    .eq("store_id", storeId)
    .in("product_id", productIds);

  for (const row of spiRows ?? []) {
    const ctx = result[row.product_id];
    if (!ctx) continue;
    ctx.availableStock = Math.max(0, Number(row.stock ?? 0));
    ctx.avgPurchasePrice =
      row.purchase_price != null ? Number(row.purchase_price) : null;
  }

  const { data: billLines } = await supabase
    .from("erp_purchase_bill_lines")
    .select(
      "product_id, purchase_price, erp_purchase_bills!inner(store_id, vendor_id, purchase_date, created_at, status)",
    )
    .eq("erp_purchase_bills.store_id", storeId)
    .neq("erp_purchase_bills.status", "cancelled")
    .in("product_id", productIds);

  const lastPurchaseRows: { productId: string; price: number; at: string }[] = [];
  const vendorPurchaseRows: { productId: string; price: number; at: string }[] = [];

  for (const line of billLines ?? []) {
    const productId = line.product_id;
    if (!productId) continue;
    const bill = line.erp_purchase_bills as {
      vendor_id: string;
      purchase_date: string;
      created_at: string;
    };
    const at = bill.purchase_date ?? bill.created_at;
    const price = Number(line.purchase_price ?? 0);
    lastPurchaseRows.push({ productId, price, at });
    if (input.vendorId && bill.vendor_id === input.vendorId) {
      vendorPurchaseRows.push({ productId, price, at });
    }
  }

  const lastPurchaseMap = latestPriceByProduct(lastPurchaseRows);
  const vendorPurchaseMap = latestPriceByProduct(vendorPurchaseRows);

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id")
    .in("product_id", productIds);

  const variantIds = (variants ?? []).map((v) => v.id);
  const variantToProduct = new Map(
    (variants ?? []).map((v) => [v.id, v.product_id]),
  );

  let invoiceQuery = supabase
    .from("invoice_items")
    .select(
      "unit_price, variant_id, invoices!inner(store_id, user_id, created_at, status)",
    )
    .eq("invoices.store_id", storeId)
    .neq("invoices.status", "cancelled");

  if (variantIds.length > 0) {
    invoiceQuery = invoiceQuery.in("variant_id", variantIds);
  } else {
    invoiceQuery = invoiceQuery.limit(0);
  }

  const { data: invoiceLines } = await invoiceQuery;

  const lastSellRows: { productId: string; price: number; at: string }[] = [];
  const customerSellRows: { productId: string; price: number; at: string }[] = [];

  for (const line of invoiceLines ?? []) {
    const productId = line.variant_id
      ? variantToProduct.get(line.variant_id)
      : undefined;
    if (!productId || !result[productId]) continue;

    const invoice = line.invoices as {
      user_id: string;
      created_at: string;
    };
    const price = Number(line.unit_price ?? 0);
    const at = invoice.created_at;
    lastSellRows.push({ productId, price, at });
    if (input.customerId && invoice.user_id === input.customerId) {
      customerSellRows.push({ productId, price, at });
    }
  }

  const lastSellMap = latestPriceByProduct(lastSellRows);
  const customerSellMap = latestPriceByProduct(customerSellRows);

  for (const productId of productIds) {
    const ctx = result[productId];
    ctx.lastPurchasePrice = lastPurchaseMap.get(productId) ?? null;
    ctx.lastSellingPrice = lastSellMap.get(productId) ?? null;

    if (input.customerId) {
      ctx.counterpartyLastPrice = customerSellMap.get(productId) ?? null;
    } else if (input.vendorId) {
      ctx.counterpartyLastPrice = vendorPurchaseMap.get(productId) ?? null;
    }
  }

  return result;
}
