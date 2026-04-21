"use server";

import { revalidatePath } from "next/cache";

import {
  deleteProductIfNoVariants,
  insertProduct,
  setProductActive,
  updateProductById,
} from "@/modules/products/services/products.service";

export async function createProductAction(data: {
  name: string;
  description: string;
  categoryId: string | null;
  imageUrl: string | null;
  isVeg: boolean;
}): Promise<void> {
  await insertProduct({
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId || null,
    imageUrl: data.imageUrl,
    isVeg: data.isVeg,
  });
  revalidatePath("/admin/products");
}

export async function updateProductAction(
  id: string,
  data: {
    name: string;
    description: string;
    categoryId: string | null;
    imageUrl: string | null;
    isVeg: boolean;
  },
): Promise<void> {
  await updateProductById(id, {
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId || null,
    imageUrl: data.imageUrl,
    isVeg: data.isVeg,
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

export async function deleteProductAction(id: string): Promise<void> {
  await deleteProductIfNoVariants(id);
  revalidatePath("/admin/products");
}
