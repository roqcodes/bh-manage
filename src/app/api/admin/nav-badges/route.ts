import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { getAdminNavBadges } from "@/modules/admin/services/nav-badges.service";

export async function GET() {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const payload = await getAdminNavBadges();
  return NextResponse.json(payload);
}
