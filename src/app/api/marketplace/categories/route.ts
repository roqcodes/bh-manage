import { NextResponse } from "next/server";

import { getMarketplaceCategories } from "@/modules/marketplace/services/marketplace-products.service";

/**
 * GET /api/marketplace/categories
 * Get all active categories with product counts.
 * Cached for performance.
 */
export async function GET() {
  try {
    const categories = await getMarketplaceCategories();

    return NextResponse.json({
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
