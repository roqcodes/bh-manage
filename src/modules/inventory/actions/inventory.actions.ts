"use server";

import { revalidatePath } from "next/cache";

import { upsertInventoryStock } from "@/modules/inventory/services/inventory.service";

export async function overrideStockAction(
  variantId: string,
  stock: number,
): Promise<void> {
  await upsertInventoryStock(variantId, stock);
  revalidatePath("/admin/inventory");
}
