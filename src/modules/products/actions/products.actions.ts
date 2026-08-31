"use server";

import { revalidatePath } from "next/cache";

import {
  deleteProduct,
  insertProduct,
  setProductActive,
  setProductsActiveByIds,
  updateProductById,
  updateProductSpecs,
} from "@/modules/products/services/products.service";
import {
  addProductImages,
  addProductVideos,
  syncProductImages,
  syncProductVideos,
} from "@/modules/products/services/product-media.service";

export async function createProductAction(data: {
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  imageUrl: string | null;
  variantLayout?: "flat" | "grouped";
  imageUrls?: string[];
  videoUrls?: string[];
  itemType?: "goods" | "service";
  hsnSac?: string | null;
}): Promise<string> {
  const id = await insertProduct({
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId || null,
    brandId: data.brandId || null,
    imageUrl: data.imageUrl,
    variantLayout: data.variantLayout,
    itemType: data.itemType,
    hsnSac: data.hsnSac,
  });
  if (data.imageUrls && data.imageUrls.length > 0) {
    await addProductImages(id, data.imageUrls);
  }
  if (data.videoUrls && data.videoUrls.length > 0) {
    await addProductVideos(id, data.videoUrls);
  }
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
    imageUrls?: string[];
    videoUrls?: string[];
    imagePreviewIndex?: number;
    itemType?: "goods" | "service";
    hsnSac?: string | null;
  },
): Promise<void> {
  await updateProductById(id, {
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId || null,
    brandId: data.brandId || null,
    imageUrl: data.imageUrl,
    itemType: data.itemType,
    hsnSac: data.hsnSac,
  });
  if (data.imageUrls !== undefined) {
    await syncProductImages(id, data.imageUrls, data.imagePreviewIndex ?? 0);
  }
  if (data.videoUrls !== undefined) {
    await syncProductVideos(id, data.videoUrls);
  }
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
  await deleteProduct(id);
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
    await deleteProduct(id);
  }
  revalidatePath("/admin/products");
}
