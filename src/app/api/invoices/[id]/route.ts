import { NextResponse } from "next/server";

import { getInvoiceById, getInvoiceByOrderId } from "@/modules/invoice/services/invoice.service";

/**
 * GET /api/invoices/[id]
 * Get single invoice detail.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;

    const invoice = await getInvoiceById(id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized: User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/invoices/order/[orderId]
 * Get invoice by order ID.
 */
export async function GETByOrderId(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  try {
    const { orderId } = await params;

    const invoice = await getInvoiceByOrderId(orderId);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found for this order" },
        { status: 404 },
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized: User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error fetching invoice by order:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 },
    );
  }
}
