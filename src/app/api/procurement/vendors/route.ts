import { NextResponse } from "next/server";

import { getProcurementVendors } from "@/modules/procurement/services/procurement-api.service";

/**
 * GET /api/procurement/vendors
 * Get vendors available for procurement.
 */
export async function GET() {
  try {
    const { vendors } = await getProcurementVendors();

    return NextResponse.json({
      vendors,
      count: vendors.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized: User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    console.error("Error fetching procurement vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 },
    );
  }
}
