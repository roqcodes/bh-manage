import { NextResponse } from "next/server";

import type { UserProfile } from "@/common/auth/types";
import { UserRole } from "@/common/auth/types";
import { canAccessRolePath } from "@/modules/auth/access.control";
import { AUTH_ROUTES } from "@/modules/auth/services/auth-route.service";
import { getCurrentSessionProfile } from "@/modules/auth/services/auth.service";

function isAdminAreaRole(role: UserRole | null): boolean {
  return role === UserRole.Admin || role === UserRole.Manager;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function adminForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** Same rules as `requireAdminAreaAccess`, but JSON errors for Route Handlers. */
export async function requireAdminApiProfile(): Promise<
  | { ok: true; profile: UserProfile }
  | { ok: false; response: NextResponse }
> {
  const { user, profile } = await getCurrentSessionProfile();

  if (!user || !profile) {
    return { ok: false, response: adminUnauthorized() };
  }

  if (!profile.is_verified || !profile.role) {
    return { ok: false, response: adminUnauthorized() };
  }

  if (!isAdminAreaRole(profile.role)) {
    return { ok: false, response: adminForbidden() };
  }

  if (!canAccessRolePath(AUTH_ROUTES.admin, profile.role)) {
    return { ok: false, response: adminForbidden() };
  }

  return { ok: true, profile };
}
