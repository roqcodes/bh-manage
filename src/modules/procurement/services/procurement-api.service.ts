import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import {
  runProcurementEngine,
  aggregatePendingOrderDemand,
  getInventoryStockForVariants,
  getVendorProductOffersForVariants,
  rebuildProcurementPlanFromAllocations,
} from "@/modules/procurement/services/procurement.service";
import { createPurchaseOrdersFromAllocations } from "@/modules/purchase-orders/services/purchase-orders.service";
import type { AllocationLine, ProcurementPlan } from "@/modules/procurement/types";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";

/**
 * Generate procurement plan from pending orders.
 */
export async function generateProcurementPlan(): Promise<ProcurementPlan> {
  await requireAdminOrManagerProfile();
  return runProcurementEngine();
}

/**
 * Get vendors available for procurement.
 */
export async function getProcurementVendors(): Promise<{
  vendors: {
    id: string;
    name: string | null;
    contact: string | null;
    is_active: boolean | null;
    productCount: number;
  }[];
}> {
  await requireAdminOrManagerProfile();

  const supabase = await createSupabaseServerClient();

  const { data: vendors, error } = await supabase
    .from("vendors")
    .select(
      `
      id,
      name,
      contact,
      is_active,
      vendor_products!inner(id, vendor_id)
    `,
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    vendors: (vendors || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      contact: v.contact,
      is_active: v.is_active,
      productCount: v.vendor_products?.length || 0,
    })),
  };
}

/**
 * Create purchase orders from allocation lines.
 */
export async function createPurchaseOrders(
  allocations: AllocationLine[],
): Promise<{
  poIds: string[];
  pos: {
    id: string;
    vendor_id: string;
    vendor_name?: string;
    total_amount: number | null;
    status: string | null;
    items: {
      variant_id: string;
      quantity: number | null;
      price: number | null;
    }[];
  }[];
}> {
  await requireAdminOrManagerProfile();

  const { poIds } = await createPurchaseOrdersFromAllocations(allocations);

  // Fetch created POs with details
  const supabase = await createSupabaseServerClient();

  const { data: pos, error } = await supabase
    .from("purchase_orders")
    .select(
      `
      id,
      vendor_id,
      total_amount,
      status,
      purchase_order_items!inner(
        variant_id,
        quantity,
        price
      ),
      vendors(name)
    `,
    )
    .in("id", poIds);

  if (error) {
    throw new Error(error.message);
  }

  return {
    poIds,
    pos: (pos || []).map((p: any) => ({
      id: p.id,
      vendor_id: p.vendor_id,
      vendor_name: p.vendors?.name,
      total_amount: p.total_amount,
      status: p.status,
      items: (p.purchase_order_items || []).map((i: any) => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
        price: i.price,
      })),
    })),
  };
}

/**
 * Get demand summary (pending orders requiring procurement).
 */
export async function getProcurementDemand(): Promise<{
  demand: {
    variant_id: string;
    demand_qty: number;
    variant_name?: string | null;
    product_name?: string | null;
  }[];
  totalVariants: number;
  totalQuantity: number;
}> {
  await requireAdminOrManagerProfile();

  const demandRows = await aggregatePendingOrderDemand();

  if (demandRows.length === 0) {
    return { demand: [], totalVariants: 0, totalQuantity: 0 };
  }

  const supabase = await createSupabaseServerClient();
  const variantIds = demandRows.map((d) => d.variant_id);

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, name, products(name)")
    .in("id", variantIds);

  const variantMap = new Map(
    (variants || []).map((v: any) => [
      v.id,
      {
        variant_name: v.name,
        product_name: v.products?.name,
      },
    ]),
  );

  const demand = demandRows.map((d) => ({
    variant_id: d.variant_id,
    demand_qty: d.demand_qty,
    variant_name: variantMap.get(d.variant_id)?.variant_name || null,
    product_name: variantMap.get(d.variant_id)?.product_name || null,
  }));

  return {
    demand,
    totalVariants: demand.length,
    totalQuantity: demand.reduce((sum, d) => sum + d.demand_qty, 0),
  };
}

/**
 * Get current inventory levels for variants.
 */
export async function getProcurementInventory(
  variantIds?: string[],
): Promise<{
  inventory: {
    variant_id: string;
    stock: number | null;
    variant_name?: string | null;
    product_name?: string | null;
  }[];
}> {
  await requireAdminOrManagerProfile();

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("inventory")
    .select(
      `
      variant_id,
      stock,
      product_variants!inner(
        id,
        name,
        products(name)
      )
    `,
    );

  if (variantIds && variantIds.length > 0) {
    query = query.in("variant_id", variantIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    inventory: (data || []).map((d: any) => ({
      variant_id: d.variant_id,
      stock: d.stock,
      variant_name: d.product_variants?.name,
      product_name: d.product_variants?.products?.name,
    })),
  };
}

/**
 * Get vendor product offers for variants.
 */
export async function getVendorOffers(
  variantIds: string[],
): Promise<{
  offers: {
    id: string;
    vendor_id: string;
    vendor_name?: string;
    variant_id: string;
    base_price: number;
    stock: number;
  }[];
}> {
  await requireAdminOrManagerProfile();

  const offers = await getVendorProductOffersForVariants(variantIds);

  if (offers.length === 0) {
    return { offers: [] };
  }

  const supabase = await createSupabaseServerClient();
  const vendorIds = [...new Set(offers.map((o) => o.vendor_id))];

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name")
    .in("id", vendorIds);

  const vendorMap = new Map(
    (vendors || []).map((v: any) => [v.id, v.name]),
  );

  return {
    offers: offers.map((o) => ({
      id: o.id,
      vendor_id: o.vendor_id,
      vendor_name: vendorMap.get(o.vendor_id) || null,
      variant_id: o.variant_id,
      base_price: o.base_price,
      stock: o.stock,
    })),
  };
}
