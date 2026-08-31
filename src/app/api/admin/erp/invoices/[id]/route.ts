import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  cancelErpInvoice,
  getErpInvoiceDetail,
  getErpInvoiceEditable,
  updateErpInvoice,
} from "@/modules/erp/services/erp-invoices.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const [invoice, editable] = await Promise.all([
      getErpInvoiceDetail(id),
      getErpInvoiceEditable(id),
    ]);
    return NextResponse.json({ ...invoice, editable });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load invoice";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    await updateErpInvoice(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update invoice";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await cancelErpInvoice(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to cancel invoice";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
