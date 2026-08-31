import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { resolveAuthAvatarUrl } from "@/modules/auth/lib/resolve-auth-avatar-url";

/** Client layout bootstrap — same rules as server `requireAdminAreaAccess`, JSON-shaped. */
export async function GET() {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    profile: {
      ...auth.profile,
      avatar_url: resolveAuthAvatarUrl(user),
    },
  });
}
