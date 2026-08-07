import "server-only";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";

/** Decrement central stock when an order is placed (multiplier -1). */
export async function commitOrderInventory(orderId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("inventory_apply_order_stock", {
    p_order_id: orderId,
    p_multiplier: -1,
  });
  if (error) throw new Error(error.message);
}

/** Restore central stock when a paid order is cancelled (multiplier +1). */
export async function restoreOrderInventory(orderId: string): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("inventory_apply_order_stock", {
    p_order_id: orderId,
    p_multiplier: 1,
  });
  if (error) throw new Error(error.message);
}

/** Credit a customer's wallet (admin/manager only — uses security definer RPC). */
export async function creditCustomerWallet(
  userId: string,
  amount: number,
  reference: string,
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("wallet_credit_user", {
    p_user_id: userId,
    p_amount: amount,
    p_reference: reference,
  });
  if (error) throw new Error(error.message);
}
