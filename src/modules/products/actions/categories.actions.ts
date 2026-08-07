"use server";

import { revalidatePath } from "next/cache";

import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryInput,
} from "@/modules/products/services/categories.service";

export async function createCategoryAction(
  input: CategoryInput,
): Promise<string> {
  const id = await createCategory(input);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  return id;
}

export async function updateCategoryAction(
  id: string,
  input: Partial<CategoryInput>,
): Promise<void> {
  await updateCategory(id, input);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await deleteCategory(id);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}
