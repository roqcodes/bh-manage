"use server";

import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";

export interface BillingVariantSearchResult {
  variantId: string;
  productName: string;
  variantName: string | null;
  price: number;
  stock: number;
}

export async function searchBillingVariants(query: string): Promise<BillingVariantSearchResult[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  // For robust search without complex joins, we'll fetch variants and their products
  const { data: variants, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      name,
      price,
      products ( name, category_id ),
      inventory ( stock )
    `)
    .limit(100);

  if (error) throw new Error(error.message);

  const lowerQuery = query.toLowerCase();

  const results: BillingVariantSearchResult[] = [];
  
  for (const v of variants || []) {
    const pName = (v.products as any)?.name || "";
    const vName = v.name || "";
    
    if (pName.toLowerCase().includes(lowerQuery) || vName.toLowerCase().includes(lowerQuery) || lowerQuery === "") {
      // get stock
      const stockItem = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
      const stock = stockItem?.stock || 0;
      
      results.push({
        variantId: v.id,
        productName: pName,
        variantName: vName,
        price: v.price || 0,
        stock: stock,
      });
    }
    
    if (results.length >= 20) break;
  }

  return results;
}
