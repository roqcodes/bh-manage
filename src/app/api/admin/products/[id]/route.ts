import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getProductPricingRule } from "@/modules/pricing/services/pricing.service";
import { getCategories } from "@/modules/products/services/categories.service";
import { getBrands } from "@/modules/products/services/brands.service";
import { getProductAtGlanceMetrics } from "@/modules/products/services/product-at-glance.service";
import {
  listProductImages,
  listProductVideos,
} from "@/modules/products/services/product-media.service";
import { listVariantGroupsForProduct } from "@/modules/products/services/variant-groups.service";
import { ensureDefaultProductVariant } from "@/modules/products/services/ensure-default-product-variant.service";
import {
  getProductById,
  getProductVariants,
} from "@/modules/products/services/products.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const [product, categories, brands, pricingRule] = await Promise.all([
    getProductById(id),
    getCategories(),
    getBrands(),
    getProductPricingRule(id),
  ]);

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let variants = await getProductVariants(id);
  if (variants.length === 0 && Number(product.price) > 0) {
    try {
      await ensureDefaultProductVariant(id);
      variants = await getProductVariants(id);
    } catch {
      /* keep product detail usable if ensure fails */
    }
  }

  let variant_groups: Awaited<ReturnType<typeof listVariantGroupsForProduct>> = [];
  let product_images: Awaited<ReturnType<typeof listProductImages>> = [];
  let product_videos: Awaited<ReturnType<typeof listProductVideos>> = [];
  try {
    variant_groups = await listVariantGroupsForProduct(id);
  } catch {
    /* migration may be pending */
  }
  try {
    product_images = await listProductImages(id);
    product_videos = await listProductVideos(id);
  } catch {
    /* migration may be pending */
  }

  const glance = await getProductAtGlanceMetrics(
    id,
    variants.map((v) => v.id),
    product.use_smart_pricing === true,
    { price: product.price, mrp: product.mrp },
  );

  return NextResponse.json({
    product,
    variants,
    categories,
    brands,
    pricingRule,
    glance,
    variant_groups: variant_groups,
    product_images: product_images,
    product_videos: product_videos,
  });
}
