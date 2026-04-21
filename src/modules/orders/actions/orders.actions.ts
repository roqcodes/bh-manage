"use server";

import { revalidatePath } from "next/cache";

import type { OrderStatus } from "@/common/admin/types";
import { updateOrderStatusById } from "@/modules/orders/services/orders.service";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
): Promise<void> {
  if (!VALID_STATUSES.includes(status as OrderStatus)) {
    throw new Error("Invalid status value.");
  }

  await updateOrderStatusById(orderId, status);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
