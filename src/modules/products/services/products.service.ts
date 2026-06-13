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
  VariantImage,
} from "@/common/admin/types";
import { PAGE_SIZE } from "@/common/admin/types";

export async function getProducts(
  page = 0,
  categoryId: string | null = null,
): Promise<Paginated<ProductWithCategory>> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  let query = supabase
    .from("products")
    .select(
      "id,name,description,category_id,image_url,is_active,created_at,categories(id,name,parent_id,image_url,created_at)",
    );

  let countQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true });

  if (categoryId) {
    if (categoryId === "__uncategorized__") {
      query = query.is("category_id", null);
      countQuery = countQuery.is("category_id", null);
    } else {
      query = query.eq("category_id", categoryId);
      countQuery = countQuery.eq("category_id", categoryId);
    }
  }

  query = query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);

  const [dataResult, countResult] = await Promise.all([query, countQuery]);

  return {
    data: (dataResult.data ?? []) as unknown as ProductWithCategory[],
    total: countResult.count ?? 0,
  };
}

export interface ProductCatalogStats {
  total: number;
  active: number;
  inactive: number;
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
    categoriesCountResult,
    categoryRowsResult,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("products").select("category_id"),
  ]);

  const total = totalResult.count ?? 0;
  const active = activeResult.count ?? 0;

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
      "id,name,description,category_id,image_url,is_active,created_at,categories(id,name,parent_id,image_url,created_at)",
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
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,name,price,mrp,created_at,variant_images(id,variant_id,url,is_preview,sort_order,created_at)",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  // Fall back to a plain select if the variant_images relation isn't available
  // yet (e.g. the migration hasn't been applied), so variants still render.
  if (error) {
    const { data: plain } = await supabase
      .from("product_variants")
      .select("id,product_id,name,price,mrp,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    return ((plain ?? []) as Omit<ProductVariant, "images">[]).map((v) => ({
      ...v,
      images: [],
    }));
  }

  return ((data ?? []) as unknown as (Omit<ProductVariant, "images"> & {
    variant_images?: VariantImage[];
  })[]).map((row) => {
    const { variant_images, ...variant } = row;
    return { ...variant, images: sortVariantImages(variant_images ?? []) };
  });
}

/** Preview first, then by sort_order, then by creation time for stable display. */
function sortVariantImages(images: VariantImage[]): VariantImage[] {
  return [...images].sort((a, b) => {
    if (a.is_preview !== b.is_preview) return a.is_preview ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
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
}): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").insert({
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    image_url: input.imageUrl,
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
