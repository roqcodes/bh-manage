import { NextResponse } from "next/server";

import { createPurchaseOrders } from "@/modules/procurement/services/procurement-api.service";
import type { AllocationLine } from "@/modules/procurement/types";

/**
 * POST /api/procurement/po/create
 * Create purchase orders from allocation lines.
 * Body: { allocations: AllocationLine[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { allocations } = body;

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: "Allocations array is required" },
        { status: 400 },
      );
    }

    // Validate allocation structure
    for (const alloc of allocations) {
      if (!alloc.vendor_id || !alloc.variant_id) {
        return NextResponse.json(
          { error: "Each allocation must have vendor_id and variant_id" },
          { status: 400 },
        );
      }
      if (typeof alloc.allocated_qty !== "number" || alloc.allocated_qty <= 0) {
        return NextResponse.json(
          { error: "allocated_qty must be a positive number" },
          { status: 400 },
        );
      }
      if (typeof alloc.base_price !== "number" || alloc.base_price < 0) {
        return NextResponse.json(
          { error: "base_price must be a non-negative number" },
          { status: 400 },
        );
      }
    }

    const { poIds, pos } = await createPurchaseOrders(allocations as AllocationLine[]);

    return NextResponse.json({
      success: true,
      poIds,
      pos,
      message: `Created ${poIds.length} purchase order(s) successfully`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized: User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    console.error("Error creating purchase orders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create purchase orders" },
      { status: 500 },
    );
  }
}
