import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { Category } from "@/common/admin/types";

export async function getCategories(): Promise<Category[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id,name,parent_id,image_url,created_at")
    .order("name", { ascending: true });
  return (data ?? []) as Category[];
}
