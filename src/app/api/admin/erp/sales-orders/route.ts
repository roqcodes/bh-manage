import { NextResponse } from "next/server";

import type { OrderStatusFilter } from "@/common/admin/types";
import { requireAdminApiProfile } from "@/lib/api/admin-api-auth";
import { createSalesOrder } from "@/modules/orders/services/create-sales-order.service";
import {
  getOrders,
  getOrdersCatalogStats,
  listUsersForOrderFilter,
} from "@/modules/orders/services/orders.service";

const STATUSES: OrderStatusFilter[] = [
  "all",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function parseStatus(s: string | null): OrderStatusFilter {
  if (s && (STATUSES as string[]).includes(s)) return s as OrderStatusFilter;
  return "all";
}

export async function GET(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = parseStatus(searchParams.get("status"));
  const rawUser = searchParams.get("userId")?.trim();
  const userId = rawUser && rawUser.length > 0 ? rawUser : null;
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const storeId = searchParams.get("storeId") ?? undefined;

  const [{ data, total }, filterUsers, stats] = await Promise.all([
    getOrders(status, userId, page, "erp", storeId),
    listUsersForOrderFilter(),
    getOrdersCatalogStats("erp", storeId),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    status,
    userId,
    filterUsers,
    stats,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiProfile();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const result = await createSalesOrder(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create sales order";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
