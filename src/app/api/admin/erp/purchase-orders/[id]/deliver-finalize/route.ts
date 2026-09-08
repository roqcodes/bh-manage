import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { submitPoDeliveryAndFinalize } from "@/modules/erp/services/erp-purchase-orders.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const result = await submitPoDeliveryAndFinalize({
      poId: id,
      receiveDate: body.receiveDate,
      notes: body.notes ?? null,
      lines: body.lines ?? [],
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to submit delivery";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
