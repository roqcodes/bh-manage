import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  ErpPurchaseLineInput,
  ErpPurchaseOrderDetail,
  ErpPurchaseOrderListRow,
} from "@/common/erp/purchasing-types";
import { roundMoney } from "@/common/erp/purchasing-types";
import { logAuditEvent } from "@/modules/erp/services/audit-log.service";
import { getAdminErpContext } from "@/modules/erp/services/store-context.service";
import type { Json } from "@/lib/integrations/supabase/types";

function calcPoTotals(lines: ErpPurchaseLineInput[], discount: number) {
  let subtotal = 0;
  let tax = 0;
  let total = 0;
  for (const line of lines) {
    const taxable = roundMoney(line.quantity * line.purchasePrice);
    const lineTax = roundMoney(taxable * (line.taxRatePercent / 100));
    subtotal += taxable;
    tax += lineTax;
    total += taxable + lineTax;
  }
  total = Math.max(0, roundMoney(total - discount));
  return { subtotal: roundMoney(subtotal), tax: roundMoney(tax), total };
}

export async function listErpPurchaseOrders(options: {
  page?: number;
  limit?: number;
  status?: string;
  vendorId?: string;
  storeId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ data: ErpPurchaseOrderListRow[]; total: number }> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const page = options.page ?? 0;
  const limit = options.limit ?? 20;
  const from = page * limit;

  let query = supabase
    .from("purchase_orders")
    .select(
      "id, po_number, vendor_id, store_id, status, reference, po_date, expected_delivery_date, subtotal, tax_total, discount, total_amount, created_at, vendors(name), stores(name)",
      { count: "exact" },
    )
    .order("po_date", { ascending: false, nullsFirst: false })
    .range(from, from + limit - 1);

  if (options.status && options.status !== "all") query = query.eq("status", options.status);
  if (options.vendorId) query = query.eq("vendor_id", options.vendorId);
  if (options.storeId) query = query.eq("store_id", options.storeId);
  if (options.dateFrom) query = query.gte("po_date", options.dateFrom);
  if (options.dateTo) query = query.lte("po_date", options.dateTo);
  if (options.search?.trim()) {
    const s = options.search.trim();
    query = query.or(`po_number.ilike.%${s}%,reference.ilike.%${s}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map((row) => {
      const vendor = row.vendors as { name: string | null } | null;
      const store = row.stores as { name: string } | null;
      return {
        id: row.id,
        po_number: row.po_number,
        vendor_id: row.vendor_id,
        store_id: row.store_id,
        status: row.status,
        reference: row.reference,
        po_date: row.po_date,
        expected_delivery_date: row.expected_delivery_date,
        subtotal: Number(row.subtotal ?? 0),
        tax_total: Number(row.tax_total ?? 0),
        discount: Number(row.discount ?? 0),
        total_amount: row.total_amount != null ? Number(row.total_amount) : null,
        created_at: row.created_at,
        vendor_name: vendor?.name ?? null,
        store_name: store?.name ?? null,
      };
    }),
    total: count ?? 0,
  };
}

export async function getErpPurchaseOrderDetail(poId: string): Promise<ErpPurchaseOrderDetail | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "id, po_number, vendor_id, store_id, status, reference, po_date, expected_delivery_date, subtotal, tax_total, discount, total_amount, notes, created_at, vendors(id, name, contact, phone, email, address, trn), stores(id, name), purchase_order_items(id, variant_id, quantity, price, tax_rate_percent, tax_amount, line_total, product_variants(id, name, barcode, products(id, name)))",
    )
    .eq("id", poId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: bill } = await supabase
    .from("erp_purchase_bills")
    .select("id, purchase_bill_number, status")
    .eq("po_id", poId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...data,
    subtotal: Number(data.subtotal ?? 0),
    tax_total: Number(data.tax_total ?? 0),
    discount: Number(data.discount ?? 0),
    total_amount: data.total_amount != null ? Number(data.total_amount) : null,
    purchase_order_items: (data.purchase_order_items ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      price: Number(item.price ?? 0),
      tax_rate_percent: Number(item.tax_rate_percent ?? 0),
      tax_amount: Number(item.tax_amount ?? 0),
      line_total: Number(item.line_total ?? 0),
    })),
    linked_bill: bill
      ? {
          id: bill.id,
          purchase_bill_number: bill.purchase_bill_number,
          status: bill.status,
        }
      : null,
  } as ErpPurchaseOrderDetail;
}

export async function createErpPurchaseOrder(input: {
  vendorId: string;
  storeId?: string;
  poDate: string;
  expectedDeliveryDate?: string | null;
  reference?: string | null;
  notes?: string | null;
  lines: ErpPurchaseLineInput[];
  discount?: number;
}): Promise<string> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const ctx = await getAdminErpContext();
  const storeId = input.storeId ?? ctx?.store_id;
  if (!storeId) throw new Error("Store context is required");
  if (!input.lines.length) throw new Error("At least one line item is required");

  const linesJson: Json = input.lines.map((l) => ({
    variant_id: l.variantId ?? "",
    quantity: l.quantity,
    purchase_price: l.purchasePrice,
    tax_rate_percent: l.taxRatePercent,
  })) as Json;

  const { data, error } = await supabase.rpc("create_erp_purchase_order", {
    p_vendor_id: input.vendorId,
    p_store_id: storeId,
    p_po_date: input.poDate,
    p_expected_delivery_date: input.expectedDeliveryDate ?? undefined,
    p_reference: input.reference ?? undefined,
    p_notes: input.notes ?? undefined,
    p_lines: linesJson,
    p_discount: input.discount ?? 0,
  });

  if (error) throw new Error(error.message);

  await logAuditEvent({
    action: "create",
    entityType: "purchase_order",
    entityId: data as string,
    description: "ERP purchase order created",
    storeId,
  });

  return data as string;
}

export async function updateErpPurchaseOrder(
  poId: string,
  input: {
    vendorId: string;
    storeId: string;
    poDate: string;
    expectedDeliveryDate?: string | null;
    reference?: string | null;
    notes?: string | null;
    lines: ErpPurchaseLineInput[];
    discount?: number;
  },
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", poId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (existing.status !== "pending") {
    throw new Error("Only pending purchase orders can be edited");
  }
  if (!input.lines.length) throw new Error("At least one line item is required");

  const discount = input.discount ?? 0;
  const totals = calcPoTotals(input.lines, discount);

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      vendor_id: input.vendorId,
      store_id: input.storeId,
      po_date: input.poDate,
      expected_delivery_date: input.expectedDeliveryDate ?? null,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      discount,
      subtotal: totals.subtotal,
      tax_total: totals.tax,
      total_amount: totals.total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", poId)
    .eq("status", "pending");

  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("po_id", poId);
  if (deleteError) throw new Error(deleteError.message);

  const items = input.lines.map((line) => {
    const taxable = roundMoney(line.quantity * line.purchasePrice);
    const lineTax = roundMoney(taxable * (line.taxRatePercent / 100));
    return {
      po_id: poId,
      variant_id: line.variantId ?? null,
      quantity: line.quantity,
      price: line.purchasePrice,
      tax_rate_percent: line.taxRatePercent,
      tax_amount: lineTax,
      line_total: roundMoney(taxable + lineTax),
    };
  });

  const { error: insertError } = await supabase.from("purchase_order_items").insert(items);
  if (insertError) throw new Error(insertError.message);

  await logAuditEvent({
    action: "update",
    entityType: "purchase_order",
    entityId: poId,
    description: "Purchase order updated",
    storeId: input.storeId,
  });
}
