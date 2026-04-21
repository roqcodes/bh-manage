import "server-only";

import {
  requireAdminOnlyProfile,
  requireAdminOrManagerProfile,
} from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import {
  deleteInventoryRowForVariant,
  insertInventoryRow,
} from "@/modules/inventory/services/inventory.service";
import {
  deleteVendorProductsForVariant,
} from "@/modules/products/services/vendor-products-cleanup.service";

export async function insertVariantWithInventory(input: {
  productId: string;
  name: string;
  price: number;
  mrp: number;
}): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data: row, error: insErr } = await supabase
    .from("product_variants")
    .insert({
      product_id: input.productId,
      name: input.name,
      price: input.price,
      mrp: input.mrp,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(insErr.message);
  if (!row?.id) throw new Error("Variant insert failed.");

  try {
    await insertInventoryRow(row.id, 0);
  } catch (e) {
    await supabase.from("product_variants").delete().eq("id", row.id);
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function updateVariantById(
  id: string,
  input: { name: string; price: number; mrp: number },
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .update({
      name: input.name,
      price: input.price,
      mrp: input.mrp,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Removes vendor_products and inventory for this variant, then the variant row.
 */
export async function deleteVariantAndSupplyRows(
  variantId: string,
): Promise<void> {
  await requireAdminOnlyProfile();
  await deleteVendorProductsForVariant(variantId);
  await deleteInventoryRowForVariant(variantId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);
  if (error) throw new Error(error.message);
}
