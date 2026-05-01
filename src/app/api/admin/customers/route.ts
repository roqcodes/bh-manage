import { NextResponse } from "next/server";

import { getAllCustomers } from "@/modules/customers/services/customers.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

    const result = await getAllCustomers(page);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/admin/customers]", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}
