import "server-only";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { buildOrderItemSnapshot } from "@/modules/orders/services/order-item-pricing.service";
import {
  assignOrderFulfillmentStore,
  shipOrderFulfillments,
} from "@/modules/orders/services/order-wallet-inventory.service";
import { requireErpStoreId } from "@/modules/erp/services/store-context.service";
import { convertOrderToInvoice } from "@/modules/erp/services/convert-order-to-invoice.service";

export interface CreateManualOrderInput {
  userId?: string;
  customerName?: string;
  phone?: string;
  company?: string;
  gstNumber?: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  items: {
    variantId: string;
    quantity: number;
    unitPrice?: number;
  }[];
}

export interface CreateManualOrderResult {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  itemCount: number;
}

/** Admin POS counter sale — creates an online order, fulfills immediately at the active store. */
export async function createManualOrder(
  input: CreateManualOrderInput,
): Promise<CreateManualOrderResult> {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) throw new Error("Unauthorized");
  const supabase = await createSupabaseServerClient();
  const storeId = await requireErpStoreId();

  if (!input.items || input.items.length === 0) {
    throw new Error("Cannot create a sale with no items");
  }

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

  const finalTotalAmount = input.totalAmount;

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId ?? null,
      address_id: null,
      total_amount: finalTotalAmount,
      status: "processing",
      payment_status: "paid",
      customer_name: input.customerName || null,
      phone: input.phone || null,
      company: input.company || null,
      gst_number: input.gstNumber || null,
      source: "online",
      store_id: storeId,
      subtotal: input.subtotal,
      tax: input.tax,
      discount: input.discount,
      merchant_note: "POS counter sale",
      created_by_admin_id: auth.profile.id,
    })
    .select("id")
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  const orderId = orderData.id;

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

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsInsert);

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderId);
    throw new Error(`Failed to insert order items: ${itemsError.message}`);
  }

  try {
    await assignOrderFulfillmentStore(orderId, storeId);
    await shipOrderFulfillments(orderId);
    const { error: finalizeError } = await supabase
      .from("orders")
      .update({
        status: "delivered",
        fulfillment_status: "shipped",
        inventory_committed: true,
      })
      .eq("id", orderId);
    if (finalizeError) throw new Error(finalizeError.message);
  } catch (invErr) {
    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("orders").delete().eq("id", orderId);
    throw invErr instanceof Error
      ? invErr
      : new Error("Failed to fulfill POS sale");
  }

  try {
    await convertOrderToInvoice(orderId);
  } catch (invoiceErr) {
    console.error("[createManualOrder] invoice conversion failed:", invoiceErr);
    throw invoiceErr instanceof Error
      ? invoiceErr
      : new Error("Sale completed but invoice could not be created");
  }

  return {
    orderId,
    orderNumber: orderId.slice(0, 8).toUpperCase(),
    totalAmount: finalTotalAmount,
    itemCount: orderLineItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}
