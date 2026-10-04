import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/integrations/supabase/types";
import { buildIlikePattern, buildPrefixIlikePattern } from "@/lib/postgrest-search";

export type ActiveProductSearchRow = {
  id: string;
  name: string | null;
  barcode: string | null;
  price: number | null;
  purchase_price: number | null;
  tax_rate_percent: number | null;
};

const PRODUCT_SELECT =
  "id, name, barcode, price, purchase_price, tax_rate_percent" as const;

/** Prefer exact barcode match when the query looks like a SKU/barcode token. */
export function isLikelyBarcodeToken(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length >= 2 && /^[A-Za-z0-9-]+$/.test(trimmed);
}

export async function searchActiveGoodsProducts(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 25,
): Promise<ActiveProductSearchRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const base = () =>
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("item_type", "goods");

  if (isLikelyBarcodeToken(trimmed)) {
    const { data: exactRows, error: exactError } = await base()
      .eq("barcode", trimmed)
      .limit(limit);
    if (exactError) throw new Error(exactError.message);
    if (exactRows?.length) {
      return exactRows as ActiveProductSearchRow[];
    }
  }

  const prefix = buildPrefixIlikePattern(trimmed);
  if (prefix) {
    const { data: prefixRows, error: prefixError } = await base()
      .or(`name.ilike.${prefix},barcode.ilike.${prefix}`)
      .order("name", { ascending: true })
      .limit(limit);
    if (prefixError) throw new Error(prefixError.message);
    if (prefixRows?.length) {
      return prefixRows as ActiveProductSearchRow[];
    }
  }

  const pattern = buildIlikePattern(trimmed);
  if (!pattern) return [];

  const { data, error } = await base()
    .or(`name.ilike.${pattern},barcode.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ActiveProductSearchRow[];
}
