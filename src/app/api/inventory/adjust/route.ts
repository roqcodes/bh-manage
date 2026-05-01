import { NextResponse } from "next/server";

import { adjustStock } from "@/modules/inventory/services/stock-movements.service";

/**
 * POST /api/inventory/adjust
 * Manually adjust stock level (correction).
 * Body: { variantId: string, quantity: number (can be negative), reason: string }
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

    if (typeof quantity !== "number" || quantity === 0) {
      return NextResponse.json(
        { error: "Quantity must be a non-zero number" },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    const { movementId, newStock } = await adjustStock(
      variantId.trim(),
      quantity,
      reason.trim(),
    );

    return NextResponse.json({
      success: true,
      movementId,
      newStock,
      message: "Stock adjusted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized: User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to adjust stock" },
      { status: 500 },
    );
  }
}
