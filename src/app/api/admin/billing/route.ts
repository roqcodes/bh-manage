import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { createManualOrder } from "@/modules/orders/services/create-manual-order.service";

const createManualOrderSchema = z.object({
  userId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  gstNumber: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  totalAmount: z.number().min(0),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0).optional(),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiProfile();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const result = createManualOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.format() },
        { status: 400 }
      );
    }

    const orderData = await createManualOrder(result.data);

    return NextResponse.json(orderData, { status: 201 });
  } catch (error) {
    console.error("Failed to create manual order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
