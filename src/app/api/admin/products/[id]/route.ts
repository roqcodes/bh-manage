import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getProductPricingRule } from "@/modules/pricing/services/pricing.service";
import { getCategories } from "@/modules/products/services/categories.service";
import { getProductAtGlanceMetrics } from "@/modules/products/services/product-at-glance.service";
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

  const [product, variants, categories, pricingRule] = await Promise.all([
    getProductById(id),
    getProductVariants(id),
    getCategories(),
    getProductPricingRule(id),
  ]);

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const glance = await getProductAtGlanceMetrics(
    id,
    variants.map((v) => v.id),
    product.use_smart_pricing === true,
  );

  return NextResponse.json({ product, variants, categories, pricingRule, glance });
}
