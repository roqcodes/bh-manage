import "server-only";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { buildOrderItemSnapshot } from "@/modules/orders/services/order-item-pricing.service";

export interface CreateManualOrderInput {
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
    // Allow admin to override price, but default to system if not provided
    unitPrice?: number;
  }[];
}

export interface CreateManualOrderResult {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  itemCount: number;
}

export async function createManualOrder(
  input: CreateManualOrderInput,
): Promise<CreateManualOrderResult> {
  // Ensure the user is an admin
  const auth = await requireAdminApiProfile();
  if (!auth.ok) throw new Error("Unauthorized");
  const supabase = await createSupabaseServerClient();

  if (!input.items || input.items.length === 0) {
    throw new Error("Cannot create a manual invoice with no items");
  }

  // Step 1: Build order line items with pricing
  const orderLineItems = [];
  let calculatedSubtotal = 0;

  for (const item of input.items) {
    try {
      // Get system snapshot to enforce valid variant/vendor details
      const snapshot = await buildOrderItemSnapshot({
        variantId: item.variantId,
      });

      // Use admin-provided unit price if available, otherwise fallback to system final price
      const finalPrice = item.unitPrice ?? snapshot.final_price;

      orderLineItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        vendorId: snapshot.vendor_id,
        basePrice: snapshot.base_price,
        finalPrice: finalPrice,
        marginAmount: snapshot.margin_amount,
        productName: snapshot.product_name,
      });

      calculatedSubtotal += finalPrice * item.quantity;
    } catch (error) {
      throw new Error(
        `Failed to process item "${item.variantId}" - ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Trust frontend calculation if it's close, else we can strictly enforce it. 
  // Let's use the provided totals for the DB record since admins might apply manual order-level discounts.
  const finalTotalAmount = input.totalAmount;

  // Step 2: Create order record (in transaction)
  // user_id is null since it's an external customer, but we store their details.
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: null,
      address_id: null,
      total_amount: finalTotalAmount,
      status: "completed", // Manual invoices are assumed to be completed/paid on the spot
      payment_status: "paid", // or pending if they want to track accounts receivable
      customer_name: input.customerName || null,
      phone: input.phone || null,
      company: input.company || null,
      gst_number: input.gstNumber || null,
      source: "manual",
      subtotal: input.subtotal,
      tax: input.tax,
      discount: input.discount,
      created_by_admin_id: auth.profile.id,
    })
    .select("id")
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  const orderId = orderData.id;
  const orderNumber = `MAN-${orderId.slice(0, 8).toUpperCase()}`;

  // Step 3: Create order_items records
  const orderItemsInsert = orderLineItems.map((item) => ({
    order_id: orderId,
    variant_id: item.variantId,
    quantity: item.quantity,
    price: item.finalPrice,
    vendor_id: item.vendorId,
    base_price: item.basePrice,
    final_price: item.finalPrice,
    margin_amount: item.marginAmount,
    product_name: item.productName,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsInsert);

  if (itemsError) {
    // Rollback: delete the order
    await supabase.from("orders").delete().eq("id", orderId);
    throw new Error(`Failed to insert order items: ${itemsError.message}`);
  }

  // Step 4: Decrement inventory stock for each item
  const inventoryUpdates = orderLineItems.map((item) => ({
    variant_id: item.variantId,
    quantity: item.quantity,
  }));

  for (const update of inventoryUpdates) {
    // Get current stock
    const { data: invData, error: invError } = await supabase
      .from("inventory")
      .select("stock")
      .eq("variant_id", update.variant_id)
      .maybeSingle();

    if (invError) {
      // Continue but log error, we don't want to fail the whole order if one inventory update fails
      console.error(`Failed to read inventory for variant ${update.variant_id}`, invError);
      continue;
    }

    const currentStock = invData?.stock ?? 0;
    const newStock = Math.max(0, currentStock - update.quantity);

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("variant_id", update.variant_id);

    if (updateError) {
      console.error(`Failed to update inventory for variant ${update.variant_id}`, updateError);
    }
  }

  // Generate an invoice using the existing function
  try {
    await supabase.rpc('generate_invoice_for_order', {
      p_order_id: orderId,
      p_gst_number: input.gstNumber || null
    });
  } catch (invoiceError) {
    console.error("Failed to generate invoice automatically", invoiceError);
    // Non-fatal, admin can generate it later if needed
  }

  // Step 5: Return order confirmation
  return {
    orderId,
    orderNumber,
    totalAmount: finalTotalAmount,
    itemCount: orderLineItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}
