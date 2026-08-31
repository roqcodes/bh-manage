import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getStoreStockForVariant } from "@/modules/erp/services/erp-stock-details.service";

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  const variantId = searchParams.get("variantId");
  if (!storeId || !variantId) {
    return NextResponse.json({ error: "storeId and variantId required" }, { status: 400 });
  }
  try {
    const stock = await getStoreStockForVariant(storeId, variantId);
    return NextResponse.json({ stock });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to get stock";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
