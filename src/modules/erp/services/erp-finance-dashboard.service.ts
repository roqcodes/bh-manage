import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ErpFinancialDashboard, ErpReconciliationSnapshot } from "@/common/erp/finance-types";

export async function getFinancialDashboard(): Promise<ErpFinancialDashboard> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_erp_financial_dashboard");
  if (error) throw new Error(error.message);
  return data as ErpFinancialDashboard;
}

export async function getReconciliationSnapshot(): Promise<ErpReconciliationSnapshot> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_erp_reconciliation_snapshot");
  if (error) throw new Error(error.message);
  return data as ErpReconciliationSnapshot;
}
