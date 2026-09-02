import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { listAuditLogsForEntity } from "@/modules/erp/services/audit-log.service";
import type { AuditLogEntry } from "@/common/erp/types";

export type SalesOrderDetail = {
  id: string;
  sales_order_number: string | null;
  reference_number: string | null;
  status: string;
  payment_status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  shipment_date: string | null;
  delivery_method: string | null;
  merchant_note: string | null;
  created_at: string;
  inventory_committed: boolean;
  invoice_id: string | null;
  users: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    company_name: string | null;
  } | null;
  stores: { id: string; name: string } | null;
  order_items: Array<{
    id: string;
    product_name: string | null;
    quantity: number;
    final_price: number;
    price: number;
  }>;
};

export async function getSalesOrderDetail(
  orderId: string,
): Promise<{ order: SalesOrderDetail; auditLogs: AuditLogEntry[] } | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, sales_order_number, reference_number, status, payment_status, subtotal, tax, discount, total_amount, shipment_date, delivery_method, merchant_note, created_at, inventory_committed, invoice_id, source, users:users!orders_user_fkey(id, name, email, phone, company_name), stores(id, name), order_items(id, product_name, quantity, final_price, price)",
    )
    .eq("id", orderId)
    .eq("source", "sales_order")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data;
  const auditLogs = await listAuditLogsForEntity("sales_order", orderId);

  return {
    order: {
      id: row.id,
      sales_order_number: row.sales_order_number,
      reference_number: row.reference_number,
      status: row.status,
      payment_status: row.payment_status,
      subtotal: Number(row.subtotal ?? 0),
      tax: Number(row.tax ?? 0),
      discount: Number(row.discount ?? 0),
      total_amount: Number(row.total_amount ?? 0),
      shipment_date: row.shipment_date,
      delivery_method: row.delivery_method,
      merchant_note: row.merchant_note,
      created_at: row.created_at,
      inventory_committed: Boolean(row.inventory_committed),
      invoice_id: row.invoice_id ?? null,
      users: row.users as SalesOrderDetail["users"],
      stores: row.stores as SalesOrderDetail["stores"],
      order_items: (row.order_items ?? []).map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: Number(item.quantity ?? 0),
        final_price: Number(item.final_price ?? item.price ?? 0),
        price: Number(item.price ?? 0),
      })),
    },
    auditLogs,
  };
}
