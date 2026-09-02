import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getSalesOrderDetail } from "@/modules/orders/services/sales-order-detail.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const result = await getSalesOrderDetail(id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/admin/erp/sales-orders/[id]]", error);
    return NextResponse.json({ error: "Failed to load sales order" }, { status: 500 });
  }
}
