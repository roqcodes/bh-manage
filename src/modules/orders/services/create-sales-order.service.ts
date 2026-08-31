import "server-only";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { buildOrderItemSnapshot } from "@/modules/orders/services/order-item-pricing.service";
import { commitOrderInventory } from "@/modules/orders/services/order-wallet-inventory.service";
import { logAuditEvent } from "@/modules/erp/services/audit-log.service";
import { getAdminErpContext } from "@/modules/erp/services/store-context.service";

export interface CreateSalesOrderInput {
  userId: string;
  storeId?: string;
  referenceNumber?: string;
  shipmentDate?: string;
  deliveryMethod?: string;
  salesPersonId?: string;
  estimateId?: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  items: { variantId: string; quantity: number; unitPrice?: number }[];
}

export async function createSalesOrder(input: CreateSalesOrderInput): Promise<{
  orderId: string;
  salesOrderNumber: string;
}> {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) throw new Error("Unauthorized");

  const supabase = await createSupabaseServerClient();
  const ctx = await getAdminErpContext();
  const storeId = input.storeId ?? ctx?.store_id;
  if (!storeId) {
    throw new Error("Store is required for sales orders");
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      address_id: null,
      total_amount: input.totalAmount,
      status: "processing",
      payment_status: "pending",
      source: "sales_order",
      subtotal: input.subtotal,
      tax: input.tax,
      discount: input.discount,
      created_by_admin_id: auth.profile.id,
      reference_number: input.referenceNumber ?? null,
      shipment_date: input.shipmentDate ?? null,
      delivery_method: input.deliveryMethod ?? null,
      sales_person_id: input.salesPersonId ?? null,
      store_id: storeId,
      estimate_id: input.estimateId ?? null,
    })
    .select("id, sales_order_number")
    .single();

  if (orderError) throw new Error(orderError.message);

  const orderId = orderData.id;
  const soNumber = orderData.sales_order_number ?? orderId;

  const orderLineItems = [];
  for (const item of input.items) {
    const snapshot = await buildOrderItemSnapshot({
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceOverride: item.unitPrice,
    });
    orderLineItems.push({
      variantId: item.variantId,
      quantity: item.quantity,
      vendorId: snapshot.vendor_id,
      basePrice: snapshot.base_price,
      finalPrice: snapshot.final_price,
      marginAmount: snapshot.margin_amount,
      productName: snapshot.product_name,
    });
  }

  const orderItemsInsert = orderLineItems.map((item) => ({
    order_id: orderId,
    variant_id: item.variantId,
    quantity: item.quantity,
    price: item.finalPrice,
    vendor_id: item.vendorId || null,
    base_price: item.basePrice,
    final_price: item.finalPrice,
    margin_amount: item.marginAmount,
    product_name: item.productName,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsInsert);
  if (itemsError) throw new Error(itemsError.message);

  await commitOrderInventory(orderId);

  await logAuditEvent({
    action: "create",
    entityType: "sales_order",
    entityId: orderId,
    description: `Sales order ${soNumber}`,
    storeId: storeId ?? undefined,
  });

  return { orderId, salesOrderNumber: soNumber };
}
