"use server";

import { revalidatePath } from "next/cache";

import {
  rebuildProcurementPlanFromAllocations,
  runProcurementEngine,
  updateProcurementDefaults,
  getProcurementDefaults,
} from "@/modules/procurement/services/procurement.service";
import type {
  AllocationLine,
  ProcurementDefaults,
  ProcurementPlan,
  ProcurementSourcingNeed,
} from "@/modules/procurement/types";

export async function runProcurementEngineAction(): Promise<ProcurementPlan> {
  return runProcurementEngine();
}

export async function synchronizeProcurementPlanAction(
  lines: AllocationLine[],
  needs_sourcing: ProcurementSourcingNeed[] = [],
  defaults?: ProcurementDefaults,
): Promise<ProcurementPlan> {
  return rebuildProcurementPlanFromAllocations(lines, needs_sourcing, defaults);
}

export async function updateProcurementDefaultsAction(
  settings: ProcurementDefaults,
): Promise<ProcurementDefaults> {
  const result = await updateProcurementDefaults(settings);
  revalidatePath("/admin/procurement");
  revalidatePath("/admin/inventory");
  return result;
}

export async function getProcurementDefaultsAction(): Promise<ProcurementDefaults> {
  return getProcurementDefaults();
}
