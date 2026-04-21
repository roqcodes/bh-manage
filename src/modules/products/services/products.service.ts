import "server-only";

import {
  requireAdminOnlyProfile,
  requireAdminOrManagerProfile,
} from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  Paginated,
  ProductWithCategory,
  ProductVariant,
} from "@/common/admin/types";
import { PAGE_SIZE } from "@/common/admin/types";

export async function getProducts(
  page = 0,
): Promise<Paginated<ProductWithCategory>> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  const [dataResult, countResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,description,category_id,image_url,is_active,is_veg,created_at,categories(id,name,parent_id,image_url,created_at)",
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    data: (dataResult.data ?? []) as unknown as ProductWithCategory[],
    total: countResult.count ?? 0,
  };
}

export interface ProductCatalogStats {
  total: number;
  active: number;
  inactive: number;
  veg: number;
  nonVeg: number;
  categoriesCount: number;
  uncategorized: number;
  categoryCounts: Record<string, number>;
}

export async function getProductCatalogStats(): Promise<ProductCatalogStats> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const [
    totalResult,
    activeResult,
    vegResult,
    categoriesCountResult,
    categoryRowsResult,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_veg", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("products").select("category_id"),
  ]);

  const total = totalResult.count ?? 0;
  const active = activeResult.count ?? 0;
  const veg = vegResult.count ?? 0;

  const categoryCounts: Record<string, number> = {};
  let uncategorized = 0;
  for (const row of (categoryRowsResult.data ?? []) as {
    category_id: string | null;
  }[]) {
    if (row.category_id == null) {
      uncategorized += 1;
    } else {
      categoryCounts[row.category_id] =
        (categoryCounts[row.category_id] ?? 0) + 1;
    }
  }

  return {
    total,
    active,
    inactive: Math.max(0, total - active),
    veg,
    nonVeg: Math.max(0, total - veg),
    categoriesCount: categoriesCountResult.count ?? 0,
    uncategorized,
    categoryCounts,
  };
}

export async function getProductById(
  id: string,
): Promise<ProductWithCategory | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id,name,description,category_id,image_url,is_active,is_veg,created_at,categories(id,name,parent_id,image_url,created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  return data as unknown as ProductWithCategory | null;
}

export async function getProductVariants(
  productId: string,
): Promise<ProductVariant[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("product_variants")
    .select("id,product_id,name,price,mrp,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ProductVariant[];
}

export async function countVariantsForProduct(productId: string): Promise<number> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  return count ?? 0;
}

export async function insertProduct(input: {
  name: string;
  description: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  isVeg: boolean;
}): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").insert({
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    image_url: input.imageUrl,
    is_veg: input.isVeg,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateProductById(
  id: string,
  input: {
    name: string;
    description: string | null;
    categoryId: string | null;
    imageUrl: string | null;
    isVeg: boolean;
  },
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      description: input.description,
      category_id: input.categoryId,
      image_url: input.imageUrl,
      is_veg: input.isVeg,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProductIfNoVariants(productId: string): Promise<void> {
  await requireAdminOnlyProfile();
  const n = await countVariantsForProduct(productId);
  if (n > 0) {
    throw new Error("Cannot delete product while variants exist.");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
}
