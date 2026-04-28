import { NextResponse } from "next/server";

import {
  generateProcurementPlan,
  getProcurementDemand,
  getProcurementInventory,
} from "@/modules/procurement/services/procurement-api.service";

/**
 * GET /api/procurement/plan
 * Generate procurement plan from pending orders.
 */
export async function GET() {
  try {
    const [plan, demand, inventory] = await Promise.all([
      generateProcurementPlan(),
      getProcurementDemand(),
      getProcurementInventory(),
    ]);

    return NextResponse.json({
      plan,
      demand,
      inventory,
      summary: {
        totalCost: plan.system_total_cost,
        totalVendors: plan.by_vendor.length,
        totalAllocations: plan.allocations.length,
        totalQuantity: plan.allocations.reduce(
          (sum, a) => sum + a.allocated_qty,
          0,
        ),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized: User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    console.error("Error generating procurement plan:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate procurement plan" },
      { status: 500 },
    );
  }
}
