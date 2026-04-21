"use server";

import {
  rebuildProcurementPlanFromAllocations,
  runProcurementEngine,
} from "@/modules/procurement/services/procurement.service";
import type { AllocationLine, ProcurementPlan } from "@/modules/procurement/types";

export async function runProcurementEngineAction(): Promise<ProcurementPlan> {
  return runProcurementEngine();
}

export async function synchronizeProcurementPlanAction(
  lines: AllocationLine[],
): Promise<ProcurementPlan> {
  return rebuildProcurementPlanFromAllocations(lines);
}
