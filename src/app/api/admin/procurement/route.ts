import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getProcurementInsights } from "@/modules/procurement/services/procurement.service";

export async function GET() {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const insights = await getProcurementInsights();
  return NextResponse.json({ insights });
}
