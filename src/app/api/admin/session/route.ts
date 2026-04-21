import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";

/** Client layout bootstrap — same rules as server `requireAdminAreaAccess`, JSON-shaped. */
export async function GET() {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  return NextResponse.json({ profile: auth.profile });
}
