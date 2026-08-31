import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { ErpContext, Store } from "@/common/erp/types";
import { getErpContext } from "@/modules/erp/services/audit-log.service";

export async function getAdminErpContext(): Promise<ErpContext | null> {
  await requireAdminOrManagerProfile();
  return getErpContext();
}

export async function resolveErpStoreId(explicit?: string | null): Promise<string | null> {
  if (explicit) return explicit;
  const ctx = await getAdminErpContext();
  return ctx?.store_id ?? null;
}

/** Store-owned accounts plus company-wide (null store_id) accounts. */
export function withAccountStoreScope<T extends { or: (filter: string) => T }>(
  query: T,
  storeId: string | null | undefined,
): T {
  if (!storeId) return query;
  return query.or(`store_id.eq.${storeId},store_id.is.null`);
}

export async function listActiveStores(): Promise<Store[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Store[];
}

export async function setActiveStore(storeId: string): Promise<ErpContext | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("set_user_active_store", {
    p_store_id: storeId,
  });
  if (error) throw new Error(error.message);
  return data as unknown as ErpContext;
}
