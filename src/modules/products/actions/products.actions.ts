"use server";

import { revalidatePath } from "next/cache";

import {
  deleteProductIfNoVariants,
  insertProduct,
  setProductActive,
  setProductsActiveByIds,
  updateProductById,
  updateProductSpecs,
} from "@/modules/products/services/products.service";

export async function createProductAction(data: {
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  imageUrl: string | null;
}): Promise<string> {
  const id = await insertProduct({
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId || null,
    brandId: data.brandId || null,
    imageUrl: data.imageUrl,
  });
  revalidatePath("/admin/products");
  return id;
}

export async function updateProductAction(
  id: string,
  data: {
    name: string;
    description: string;
    categoryId: string | null;
    brandId: string | null;
    imageUrl: string | null;
  },
): Promise<void> {
  await updateProductById(id, {
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId || null,
    brandId: data.brandId || null,
    imageUrl: data.imageUrl,
  });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

export async function toggleProductAction(
  id: string,
  isActive: boolean,
): Promise<void> {
  await setProductActive(id, isActive);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

export async function updateProductSpecsAction(
  id: string,
  specs: Record<string, string>,
): Promise<void> {
  await updateProductSpecs(id, specs);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

export async function deleteProductAction(id: string): Promise<void> {
  await deleteProductIfNoVariants(id);
  revalidatePath("/admin/products");
}

export async function bulkSetProductsActiveAction(
  ids: string[],
  isActive: boolean,
): Promise<void> {
  if (ids.length === 0) return;
  await setProductsActiveByIds(ids, isActive);
  revalidatePath("/admin/products");
  for (const id of ids) {
    revalidatePath(`/admin/products/${id}`);
  }
}

export async function bulkDeleteProductsAction(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteProductIfNoVariants(id);
  }
  revalidatePath("/admin/products");
}
