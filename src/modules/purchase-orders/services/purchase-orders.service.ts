import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { AllocationLine } from "@/modules/procurement/types";

export async function createPurchaseOrdersFromAllocations(
  lines: AllocationLine[],
): Promise<{ poIds: string[] }> {
  await requireAdminOrManagerProfile();
  if (lines.length === 0) {
    return { poIds: [] };
  }

  const supabase = await createSupabaseServerClient();

  const byVendor = new Map<string, AllocationLine[]>();
  for (const line of lines) {
    if (line.allocated_qty <= 0) continue;
    const list = byVendor.get(line.vendor_id) ?? [];
    list.push(line);
    byVendor.set(line.vendor_id, list);
  }

  const poIds: string[] = [];
  const lastQtyByVariant = new Map<string, number>();

  for (const [vendorId, group] of byVendor) {
    const total = group.reduce(
      (s, l) => s + l.allocated_qty * l.base_price,
      0,
    );

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        vendor_id: vendorId,
        status: "pending",
        total_amount: total,
      })
      .select("id")
      .single();

    if (poErr) throw new Error(poErr.message);
    const poId = po?.id as string;
    poIds.push(poId);

    const itemRows = group.map((l) => ({
      po_id: poId,
      variant_id: l.variant_id,
      quantity: l.allocated_qty,
      price: l.base_price,
    }));

    for (const l of group) {
      if (l.allocated_qty > 0) {
        lastQtyByVariant.set(l.variant_id, l.allocated_qty);
      }
    }

    const { error: iErr } = await supabase
      .from("purchase_order_items")
      .insert(itemRows);

    if (iErr) throw new Error(iErr.message);
  }

  if (lastQtyByVariant.size > 0) {
    for (const [variant_id, last_reorder_quantity] of lastQtyByVariant) {
      const { error: memErr } = await supabase
        .from("inventory")
        .update({ last_reorder_quantity })
        .eq("variant_id", variant_id);
      if (memErr) throw new Error(memErr.message);
    }
  }

  return { poIds };
}
