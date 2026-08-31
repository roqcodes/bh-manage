import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  getErpPurchaseOrderDetail,
  updateErpPurchaseOrder,
} from "@/modules/erp/services/erp-purchase-orders.service";
import { listAuditLogsForEntity } from "@/modules/erp/services/audit-log.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const po = await getErpPurchaseOrderDetail(id);
    if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auditLogs = await listAuditLogsForEntity("purchase_order", id);
    return NextResponse.json({ po, auditLogs });
  } catch (error) {
    console.error("[GET /api/admin/erp/purchase-orders/[id]]", error);
    return NextResponse.json({ error: "Failed to get purchase order" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const body = await request.json();
    await updateErpPurchaseOrder(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update purchase order";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
