import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { logAuditEvent } from "@/modules/erp/services/audit-log.service";
import { createErpInvoice } from "@/modules/erp/services/erp-invoices.service";

export async function convertSalesOrderToInvoice(orderId: string): Promise<string> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (error) throw new Error(error.message);
  if (order.source !== "sales_order") {
    throw new Error("Only ERP sales orders can be converted to invoices.");
  }
  if (order.status === "cancelled") {
    throw new Error("Cannot invoice a cancelled sales order.");
  }

  const existingInvoiceId = (order as { invoice_id?: string | null }).invoice_id;
  if (existingInvoiceId) return existingInvoiceId;

  const items = order.order_items ?? [];
  if (items.length === 0) throw new Error("Sales order has no line items.");
  if (!order.user_id) throw new Error("Sales order has no customer.");

  const lines = items.map((item: Record<string, unknown>) => ({
    variantId: item.variant_id as string | undefined,
    productName: String(item.product_name ?? "Item"),
    quantity: Number(item.quantity ?? 1),
    unitPrice: Number(item.final_price ?? item.price ?? 0),
    taxRatePercent: 5,
  }));

  const invoiceId = await createErpInvoice({
    userId: order.user_id,
    storeId: order.store_id ?? undefined,
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: order.shipment_date ?? new Date().toISOString().slice(0, 10),
    lines,
    discount: Number(order.discount ?? 0),
    taxInclusive: false,
    reference: order.reference_number ?? order.sales_order_number ?? undefined,
    notes: `Converted from sales order ${order.sales_order_number ?? orderId}`,
    finalize: true,
  });

  await supabase
    .from("orders")
    .update({ invoice_id: invoiceId } as never)
    .eq("id", orderId);

  await logAuditEvent({
    action: "convert_to_invoice",
    entityType: "sales_order",
    entityId: orderId,
    description: `Sales order converted to invoice`,
    storeId: order.store_id ?? undefined,
  });

  return invoiceId;
}

export async function billExpenseToCustomer(expenseId: string): Promise<string> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data: expense, error } = await supabase
    .from("erp_expenses")
    .select("*")
    .eq("id", expenseId)
    .single();

  if (error) throw new Error(error.message);
  const expenseRow = expense as typeof expense & {
    is_billable?: boolean;
    billable_customer_id?: string | null;
    billed_invoice_id?: string | null;
  };

  if (!expenseRow.is_billable) throw new Error("Expense is not marked as billable.");
  if (!expenseRow.billable_customer_id) throw new Error("Billable customer is required.");
  if (expenseRow.billed_invoice_id) throw new Error("Expense has already been invoiced.");

  const total = Number(expense.total_amount ?? expense.amount ?? 0);
  const taxPercent = Number(expense.tax_percent ?? 0);

  const invoiceId = await createErpInvoice({
    userId: expenseRow.billable_customer_id,
    storeId: expense.store_id ?? undefined,
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lines: [
      {
        productName: expense.reference?.trim() || "Billable expense",
        description: expense.notes ?? undefined,
        quantity: 1,
        unitPrice: total,
        taxRatePercent: taxPercent,
      },
    ],
    notes: `Billable expense ${expense.reference ?? expenseId}`,
    finalize: true,
  });

  await supabase
    .from("erp_expenses")
    .update({ billed_invoice_id: invoiceId } as never)
    .eq("id", expenseId);

  await logAuditEvent({
    action: "bill_expense",
    entityType: "expense",
    entityId: expenseId,
    description: `Billable expense invoiced`,
    storeId: expense.store_id ?? undefined,
  });

  return invoiceId;
}
