import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  createErpPurchaseOrder,
  listErpPurchaseOrders,
} from "@/modules/erp/services/erp-purchase-orders.service";

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const status = searchParams.get("status") ?? undefined;
  const vendorId = searchParams.get("vendorId") ?? undefined;
  const storeId = searchParams.get("storeId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  try {
    const result = await listErpPurchaseOrders({
      page,
      status,
      vendorId,
      storeId,
      search,
      dateFrom,
      dateTo,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/admin/erp/purchase-orders]", error);
    return NextResponse.json({ error: "Failed to list purchase orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const id = await createErpPurchaseOrder(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create purchase order";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
