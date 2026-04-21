import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  getPendingPortalRequests,
  getPendingPortalRequestCount,
  getPortalStaffUsers,
  getStoreUsers,
} from "@/modules/users/services/users.service";

type PrimaryTab = "users" | "requests";
type UserSegment = "stores" | "vendor" | "delivery" | "admin";

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const primary: PrimaryTab =
    searchParams.get("tab") === "requests" ? "requests" : "users";
  let segmentParam = searchParams.get("segment");
  if (segmentParam === "restaurants") {
    segmentParam = "stores";
  }
  const segment: UserSegment =
    segmentParam === "vendor" ||
    segmentParam === "delivery" ||
    segmentParam === "admin"
      ? segmentParam
      : "stores";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  if (primary === "requests") {
    const pending = await getPendingPortalRequests();
    return NextResponse.json({
      pendingCount: pending.length,
      primary,
      segment,
      page,
      content: { kind: "requests" as const, pending },
    });
  }

  const [pendingCount, content] = await Promise.all([
    getPendingPortalRequestCount(),
    (async () => {
      if (segment === "stores") {
        return { kind: "stores" as const, ...(await getStoreUsers(page)) };
      }
      if (segment === "vendor") {
        return { kind: "vendor" as const, ...(await getPortalStaffUsers("vendor", page)) };
      }
      if (segment === "delivery") {
        return {
          kind: "delivery" as const,
          ...(await getPortalStaffUsers("delivery", page)),
        };
      }
      return { kind: "admin" as const, ...(await getPortalStaffUsers("admin", page)) };
    })(),
  ]);

  return NextResponse.json({
    pendingCount,
    primary,
    segment,
    page,
    content,
  });
}
