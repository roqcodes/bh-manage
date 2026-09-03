import { NextResponse } from "next/server";

import type { DashboardChartGranularity } from "@/common/admin/types";
import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getAdminDashboardPayload } from "@/modules/admin/services/dashboard.service";

function parseGranularity(value: string | null): DashboardChartGranularity {
  return value === "day" ? "day" : "month";
}

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;
  const storeId = params.get("storeId");
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const granularity = parseGranularity(params.get("granularity"));
  const payload = await getAdminDashboardPayload(storeId, dateFrom, dateTo, granularity);

  return NextResponse.json(payload);
}
