import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getAdminDashboardPayload } from "@/modules/admin/services/dashboard.service";

export async function GET() {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const payload = await getAdminDashboardPayload();

  return NextResponse.json(payload);
}
