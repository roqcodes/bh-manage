import "server-only";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { Json } from "@/lib/integrations/supabase/types";
import type { AuditLogEntry, ErpContext, LogAuditEventInput } from "@/common/erp/types";

export async function getErpContext(userId?: string): Promise<ErpContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "get_erp_context",
    userId ? { p_user_id: userId } : {},
  );

  if (error) {
    console.error("get_erp_context failed:", error);
    return null;
  }

  return data as unknown as ErpContext;
}

export async function logAuditEvent(input: LogAuditEventInput): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("log_audit_event", {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? undefined,
    p_description: input.description ?? undefined,
    p_metadata: (input.metadata ?? {}) as Json,
    p_old_data: input.oldData as Json | undefined,
    p_new_data: input.newData as Json | undefined,
    p_store_id: input.storeId ?? undefined,
    p_user_id: input.userId ?? undefined,
  });

  if (error) {
    console.error("log_audit_event failed:", error);
    return null;
  }

  return data as string;
}

export async function listRecentAuditLogs(limit = 10): Promise<AuditLogEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listRecentAuditLogs failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    old_data: (row.old_data as Record<string, unknown> | null) ?? null,
    new_data: (row.new_data as Record<string, unknown> | null) ?? null,
  }));
}
