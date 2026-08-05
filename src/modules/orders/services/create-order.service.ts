import "server-only";

import { getCurrentSessionProfile } from "@/modules/auth/services/auth.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { getCart } from "@/modules/cart/services/cart.service";
import { buildOrderItemSnapshot } from "@/modules/orders/services/order-item-pricing.service";
import { clearCart } from "@/modules/cart/services/cart.service";

export interface CreateOrderInput {
  addressId: string;
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  itemCount: number;
  items: {
    variantId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vendorId: string;
  }[];
}

export interface OrderLineItem {
  variantId: string;
  quantity: number;
  vendorId: string;
  basePrice: number;
  finalPrice: number;
  marginAmount: number;
  productName: string;
}

/**
 * Create order from current user's cart.
 *
 * Flow:
 * 1. Get user's cart with items
 * 2. Validate cart has items
 * 3. Validate address exists and belongs to user
 * 4. For each cart item:
 *    - Check central warehouse stock
 *    - Charge SKU list price (reference vendor cost stored for margin reports)
 *    - Build order item snapshot
 * 5. Create order record
 * 6. Create order_items records
 * 7. Decrement inventory stock
 * 8. Clear cart
 * 9. Return order confirmation
 */
export async function createOrderFromCart(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const { user } = await getCurrentSessionProfile();
  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  const supabase = await createSupabaseServerClient();

  // Step 1: Get user's cart with items
  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  // Step 2: Validate address exists and belongs to user
  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .select("id")
    .eq("id", input.addressId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (addressError) {
    throw new Error(addressError.message);
  }

  if (!address) {
    throw new Error("Address not found or does not belong to user");
  }

  // Step 3: Build order line items with pricing
  const orderLineItems: OrderLineItem[] = [];

  for (const cartItem of cart.items) {
    try {
      const snapshot = await buildOrderItemSnapshot({
        variantId: cartItem.variant_id,
        quantity: cartItem.quantity,
      });

      orderLineItems.push({
        variantId: cartItem.variant_id,
        quantity: cartItem.quantity,
        vendorId: snapshot.vendor_id ?? "",
        basePrice: snapshot.base_price,
        finalPrice: snapshot.final_price,
        marginAmount: snapshot.margin_amount,
        productName: snapshot.product_name,
      });
    } catch (error) {
      throw new Error(
        `Failed to process item "${cartItem.product?.name || `Variant ${cartItem.variant_id}`}" - ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Step 4: Calculate total amount
  const totalAmount = orderLineItems.reduce(
    (sum, item) => sum + item.finalPrice * item.quantity,
    0,
  );

  // Step 5: Create order record (in transaction)
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      address_id: input.addressId,
      total_amount: totalAmount,
      status: "pending",
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const orderId = orderData.id;
  const orderNumber = `ORD-${orderId.slice(0, 8).toUpperCase()}`;

  // Step 6: Create order_items records
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
    // Rollback: delete the order
    await supabase.from("orders").delete().eq("id", orderId);
    throw new Error(itemsError.message);
  }

  // Step 7: Decrement inventory stock for each item
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
      throw new Error(`Failed to read inventory for variant ${update.variant_id}`);
    }

    const currentStock = invData?.stock ?? 0;
    const newStock = Math.max(0, currentStock - update.quantity);

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ stock: newStock } as any)
      .eq("variant_id", update.variant_id);

    if (updateError) {
      throw new Error(`Failed to update inventory for variant ${update.variant_id}`);
    }
  }

  // Step 8: Clear cart
  await clearCart();

  // Step 9: Return order confirmation
  return {
    orderId,
    orderNumber,
    totalAmount,
    itemCount: orderLineItems.reduce((sum, item) => sum + item.quantity, 0),
    items: orderLineItems.map((item) => ({
      variantId: item.variantId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.finalPrice,
      totalPrice: item.finalPrice * item.quantity,
      vendorId: item.vendorId,
    })),
  };
}

/**
 * Check if cart items are available in central warehouse.
 */
export async function checkCartAvailability(): Promise<{
  available: boolean;
  items: {
    variantId: string;
    productName: string;
    quantity: number;
    available: boolean;
    reason?: string;
  }[];
}> {
  const { user } = await getCurrentSessionProfile();
  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { available: true, items: [] };
  }

  const supabase = await createSupabaseServerClient();
  const items: {
    variantId: string;
    productName: string;
    quantity: number;
    available: boolean;
    reason?: string;
  }[] = [];

  for (const cartItem of cart.items) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("stock")
      .eq("variant_id", cartItem.variant_id)
      .maybeSingle();

    const centralStock = Math.max(
      0,
      Math.floor(Number(inv?.stock ?? 0)),
    );

    items.push({
      variantId: cartItem.variant_id,
      productName: cartItem.product?.name ?? "Unknown Product",
      quantity: cartItem.quantity,
      available: centralStock >= cartItem.quantity,
      reason:
        centralStock === 0
          ? "Out of stock in central warehouse"
          : centralStock < cartItem.quantity
            ? `Only ${centralStock} in central warehouse (requested ${cartItem.quantity})`
            : undefined,
    });
  }

  const allAvailable = items.every((item) => item.available);

  return { available: allAvailable, items };
}
