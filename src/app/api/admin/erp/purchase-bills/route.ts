import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  createPurchaseBill,
  listPurchaseBills,
} from "@/modules/erp/services/erp-purchase-bills.service";

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const page = Math.max(0, parseInt(new URL(request.url).searchParams.get("page") ?? "0", 10));
  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  const storeId = new URL(request.url).searchParams.get("storeId") ?? undefined;
  const vendorId = new URL(request.url).searchParams.get("vendorId") ?? undefined;
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  const dateFrom = new URL(request.url).searchParams.get("dateFrom") ?? undefined;
  const dateTo = new URL(request.url).searchParams.get("dateTo") ?? undefined;
  const openOnly = new URL(request.url).searchParams.get("openOnly") === "1";
  const limit = Math.min(
    100,
    Math.max(1, parseInt(new URL(request.url).searchParams.get("limit") ?? "20", 10)),
  );
  try {
    const result = await listPurchaseBills({
      page,
      limit,
      status,
      storeId,
      vendorId,
      search,
      dateFrom,
      dateTo,
      openOnly,
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to list purchase bills";
    console.error("[GET /api/admin/erp/purchase-bills]", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const id = await createPurchaseBill(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create purchase bill";
    console.error("[POST /api/admin/erp/purchase-bills]", error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
