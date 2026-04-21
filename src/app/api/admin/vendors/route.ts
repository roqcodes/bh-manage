import { NextResponse } from "next/server";

import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import {
  getVendorCatalogStats,
  getVendors,
} from "@/modules/vendors/services/vendors.service";

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const [{ data, total }, stats] = await Promise.all([
    getVendors(page),
    getVendorCatalogStats(),
  ]);

  return NextResponse.json({ data, total, page, stats });
}
