import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  cancelPurchaseBill,
  finalizePurchaseBill,
  getPurchaseBillDetail,
  updateDraftPurchaseBill,
} from "@/modules/erp/services/erp-purchase-bills.service";
import { listAuditLogsForEntity } from "@/modules/erp/services/audit-log.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const data = await getPurchaseBillDetail(id);
    const auditLogs = await listAuditLogsForEntity("purchase_bill", id);
    return NextResponse.json({ bill: data, auditLogs });
  } catch (error) {
    console.error("[GET /api/admin/erp/purchase-bills/[id]]", error);
    return NextResponse.json({ error: "Failed to get purchase bill" }, { status: 500 });
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    await finalizePurchaseBill(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to finalize purchase bill";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    await cancelPurchaseBill(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to cancel purchase bill";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const body = await request.json();
    await updateDraftPurchaseBill(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update purchase bill";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
