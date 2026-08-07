import "server-only";

import {
  requireAdminOnlyProfile,
  requireAdminOrManagerProfile,
} from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  Paginated,
  ProductCatalogStats,
  ProductVariant,
  ProductWithCategory,
  ProductWithCategoryListItem,
  VariantImage,
} from "@/common/admin/types";
import { PAGE_SIZE } from "@/common/admin/types";

export async function getProducts(
  page = 0,
  categoryId: string | null = null,
): Promise<Paginated<ProductWithCategoryListItem>> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  let query = supabase
    .from("products")
    .select(
      "id,name,description,category_id,brand_id,image_url,is_active,use_smart_pricing,specs,created_at,categories(id,name,parent_id,thumbnail_url,image_url,sort_order,is_active,slug,description,created_at),brands(id,name,logo_url,image_url,sort_order,is_active,slug,description,created_at)",
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
  const rows = (dataResult.data ?? []) as unknown as ProductWithCategory[];
  const enriched = await enrichProductsList(supabase, rows);

  return {
    data: enriched,
    total: countResult.count ?? 0,
  };
}

async function enrichProductsList(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  products: ProductWithCategory[],
): Promise<ProductWithCategoryListItem[]> {
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const { data: variantRows } = await supabase
    .from("product_variants")
    .select("id,product_id,name,price,mrp")
    .in("product_id", productIds);

  const variants = variantRows ?? [];
  const variantIds = variants.map((v) => v.id);

  const stockByVariant = new Map<string, number>();
  if (variantIds.length > 0) {
    const { data: inventoryRows } = await supabase
      .from("inventory")
      .select("variant_id,stock")
      .in("variant_id", variantIds);

    for (const row of inventoryRows ?? []) {
      stockByVariant.set(row.variant_id, Number(row.stock ?? 0));
    }
  }

  const summaryByProduct = new Map<
    string,
    {
      stock: number;
      priceMin: number | null;
      mrpMin: number | null;
      count: number;
      firstSku: string | null;
    }
  >();

  for (const v of variants) {
    const pid = v.product_id as string | null;
    if (!pid) continue;

    const stock = stockByVariant.get(v.id) ?? 0;
    const price = v.price != null ? Number(v.price) : null;
    const mrp = v.mrp != null ? Number(v.mrp) : null;
    const existing = summaryByProduct.get(pid) ?? {
      stock: 0,
      priceMin: null,
      mrpMin: null,
      count: 0,
      firstSku: null,
    };

    existing.stock += stock;
    existing.count += 1;
    if (existing.firstSku == null) {
      existing.firstSku =
        v.name?.trim() ||
        `PRD-${v.id.split("-")[0]?.slice(0, 4).toUpperCase() ?? v.id.slice(0, 8)}`;
    }
    if (price != null && Number.isFinite(price)) {
      existing.priceMin =
        existing.priceMin == null ? price : Math.min(existing.priceMin, price);
    }
    if (mrp != null && Number.isFinite(mrp) && mrp > 0) {
      existing.mrpMin =
        existing.mrpMin == null ? mrp : Math.min(existing.mrpMin, mrp);
    }

    summaryByProduct.set(pid, existing);
  }

  return products.map((product) => {
    const summary = summaryByProduct.get(product.id) ?? {
      stock: 0,
      priceMin: null,
      mrpMin: null,
      count: 0,
      firstSku: null,
    };

    return {
      ...product,
      stock_total: summary.stock,
      price_min: summary.priceMin,
      mrp_min: summary.mrpMin,
      variant_count: summary.count,
      sku_label: summary.firstSku,
    };
  });
}

export async function getProductCatalogStats(): Promise<ProductCatalogStats> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const [
    totalResult,
    activeResult,
    categoriesCountResult,
    categoryRowsResult,
    variantRowsResult,
    inventoryRowsResult,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("products").select("category_id"),
    supabase.from("product_variants").select("id,product_id,price"),
    supabase.from("inventory").select("variant_id,stock"),
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

  const stockByVariant = new Map<string, number>();
  for (const row of inventoryRowsResult.data ?? []) {
    stockByVariant.set(row.variant_id, Number(row.stock ?? 0));
  }

  const stockByProduct = new Map<string, number>();
  let inventoryValue = 0;

  for (const variant of variantRowsResult.data ?? []) {
    const productId = variant.product_id as string | null;
    if (!productId) continue;

    const stock = stockByVariant.get(variant.id) ?? 0;
    const price = Number(variant.price ?? 0);
    stockByProduct.set(productId, (stockByProduct.get(productId) ?? 0) + stock);
    if (Number.isFinite(price) && stock > 0) {
      inventoryValue += price * stock;
    }
  }

  let outOfStock = 0;
  const { data: allProductIds } = await supabase.from("products").select("id");
  for (const row of allProductIds ?? []) {
    const stock = stockByProduct.get(row.id) ?? 0;
    if (stock <= 0) outOfStock += 1;
  }

  return {
    total,
    active,
    inactive: Math.max(0, total - active),
    categoriesCount: categoriesCountResult.count ?? 0,
    uncategorized,
    categoryCounts,
    outOfStock,
    inventoryValue,
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
      "id,name,description,category_id,brand_id,image_url,is_active,use_smart_pricing,specs,created_at,categories(id,name,parent_id,thumbnail_url,image_url,sort_order,is_active,slug,description,created_at),brands(id,name,logo_url,image_url,sort_order,is_active,slug,description,created_at)",
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
    const plainVariants = ((plain ?? []) as Omit<ProductVariant, "images">[]).map(
      (v) => ({
        ...v,
        images: [],
      }),
    );
    return attachCentralStock(supabase, plainVariants);
  }

  const variants = (
    (data ?? []) as unknown as (Omit<ProductVariant, "images"> & {
      variant_images?: VariantImage[];
    })[]
  ).map((row) => {
    const { variant_images, ...variant } = row;
    return { ...variant, images: sortVariantImages(variant_images ?? []) };
  });

  return attachCentralStock(supabase, variants);
}

async function attachCentralStock(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  variants: ProductVariant[],
): Promise<ProductVariant[]> {
  if (variants.length === 0) return variants;

  const variantIds = variants.map((v) => v.id);
  const { data: inventoryRows } = await supabase
    .from("inventory")
    .select("variant_id,stock")
    .in("variant_id", variantIds);

  const stockByVariant = new Map<string, number>();
  for (const row of inventoryRows ?? []) {
    stockByVariant.set(row.variant_id, Number(row.stock ?? 0));
  }

  return variants.map((v) => ({
    ...v,
    central_stock: stockByVariant.get(v.id) ?? 0,
  }));
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
  brandId: string | null;
  imageUrl: string | null;
}): Promise<string> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      description: input.description,
      category_id: input.categoryId,
      brand_id: input.brandId,
      image_url: input.imageUrl,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateProductById(
  id: string,
  input: {
    name: string;
    description: string | null;
    categoryId: string | null;
    brandId: string | null;
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
      brand_id: input.brandId,
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

export async function setProductsActiveByIds(
  ids: string[],
  isActive: boolean,
): Promise<void> {
  if (ids.length === 0) return;

  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .in("id", ids);
  if (error) throw new Error(error.message);
}

export async function updateProductSpecs(
  id: string,
  specs: Record<string, string>,
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ specs }).eq("id", id);
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
