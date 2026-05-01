import { NextResponse } from "next/server";

import { markDamaged } from "@/modules/inventory/services/stock-movements.service";

/**
 * POST /api/inventory/damaged
 * Mark stock as damaged (write-off).
 * Body: { variantId: string, quantity: number, reason: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { variantId, quantity, reason } = body;

    if (!variantId || typeof variantId !== "string") {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 },
      );
    }

    if (!quantity || typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    const { movementId, newStock } = await markDamaged(
      variantId.trim(),
      quantity,
      reason.trim(),
    );

    return NextResponse.json({
      success: true,
      movementId,
      newStock,
      message: "Stock marked as damaged",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized: User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (error instanceof Error && error.message.includes("Insufficient stock")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error marking damaged stock:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark damaged stock" },
      { status: 500 },
    );
  }
}
