"use server";

import { revalidatePath } from "next/cache";

import type { AllocationLine } from "@/modules/procurement/types";
import { createPurchaseOrdersFromAllocations } from "@/modules/purchase-orders/services/purchase-orders.service";

export async function approveProcurementPlanAction(
  lines: AllocationLine[],
): Promise<{ poIds: string[] }> {
  const result = await createPurchaseOrdersFromAllocations(lines);
  revalidatePath("/admin/procurement");
  revalidatePath("/admin/purchase-orders");
  return result;
}
