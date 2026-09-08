import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  listSalesProductsForTransfer,
  searchSalesVariants,
} from "@/modules/erp/services/erp-sales-catalog.service";

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const storeId = searchParams.get("storeId") ?? undefined;
  const mode = searchParams.get("mode") ?? "search";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const stockFilter = (searchParams.get("stockFilter") ??
    "in_stock") as "all" | "in_stock" | "out_of_stock";
  const sort = (searchParams.get("sort") ?? "name") as
    | "name"
    | "stock_desc"
    | "stock_asc";
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1),
    100,
  );

  try {
    if (mode === "transfer") {
      const { data, total } = await listSalesProductsForTransfer({
        storeId,
        query: q,
        stockFilter,
        sort,
        page,
        limit,
      });
      return NextResponse.json({ data, total, page });
    }

    const data = await searchSalesVariants(q, storeId, limit);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/admin/erp/sales-catalog]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
