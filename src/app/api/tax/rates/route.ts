import { NextResponse } from "next/server";

import {
  getAllTaxRates,
  createTaxRate,
  calculateTax,
  getDefaultTaxRate,
} from "@/modules/tax/services/tax-rates.service";

export async function GET() {
  try {
    const [rates, defaultRate] = await Promise.all([
      getAllTaxRates(),
      getDefaultTaxRate(),
    ]);

    return NextResponse.json({
      rates,
      defaultRate,
    });
  } catch (error) {
    console.error("Error fetching tax rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax rates" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    if (
      typeof body.ratePercent !== "number" ||
      body.ratePercent < 0 ||
      body.ratePercent > 100
    ) {
      return NextResponse.json(
        { error: "ratePercent must be between 0 and 100" },
        { status: 400 },
      );
    }

    const id = await createTaxRate(
      body.name,
      body.ratePercent,
      body.description,
      body.isDefault,
    );

    return NextResponse.json({
      ok: true,
      id,
      message: "Tax rate created successfully",
    });
  } catch (error) {
    console.error("Error creating tax rate:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create tax rate" },
      { status: 500 },
    );
  }
}
