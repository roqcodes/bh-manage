import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isProtectedRolePath } from "@/modules/auth/access.control";
import { AUTH_ROUTES } from "@/modules/auth/services/auth-route.service";
import { createSupabaseMiddlewareClient } from "@/lib/integrations/supabase/middleware";

/**
 * Session refresh + coarse auth only. Role, verification, and route ACL are
 * enforced in layouts / guards so we do not duplicate a `users` row fetch here
 * on every navigation (that doubled Supabase latency with the RSC tree).
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabase = createSupabaseMiddlewareClient(request, response);
  const pathname = request.nextUrl.pathname;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requiresSession =
    isProtectedRolePath(pathname) || pathname === AUTH_ROUTES.pendingApproval;

  if (!user) {
    if (requiresSession) {
      return NextResponse.redirect(new URL(AUTH_ROUTES.signIn, request.url));
    }

    return response;
  }

  if (
    pathname === AUTH_ROUTES.signIn ||
    pathname === AUTH_ROUTES.signUp
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
