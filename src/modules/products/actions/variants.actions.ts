"use server";

import { revalidatePath } from "next/cache";

import {
  deleteVariantAndSupplyRows,
  insertVariantWithInventory,
  updateVariantById,
} from "@/modules/products/services/product-variants.service";
import { addVariantImages } from "@/modules/products/services/variant-images.service";

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function createVariantAction(
  productId: string,
  data: { name: string; price: number; mrp: number; imageUrls?: string[] },
): Promise<void> {
  const variantId = await insertVariantWithInventory({
    productId,
    name: data.name,
    price: roundMoney2(data.price),
    mrp: roundMoney2(data.mrp),
  });
  if (data.imageUrls && data.imageUrls.length > 0) {
    await addVariantImages(variantId, data.imageUrls);
  }
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateVariantAction(
  id: string,
  productId: string,
  data: { name: string; price: number; mrp: number },
): Promise<void> {
  await updateVariantById(id, {
    name: data.name,
    price: roundMoney2(data.price),
    mrp: roundMoney2(data.mrp),
  });
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteVariantAction(
  id: string,
  productId: string,
): Promise<void> {
  await deleteVariantAndSupplyRows(id);
  revalidatePath(`/admin/products/${productId}`);
}
