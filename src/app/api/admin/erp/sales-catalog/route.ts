import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { searchSalesVariants } from "@/modules/erp/services/erp-sales-catalog.service";

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const storeId = searchParams.get("storeId") ?? undefined;
  try {
    const data = await searchSalesVariants(q, storeId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/admin/erp/sales-catalog]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
