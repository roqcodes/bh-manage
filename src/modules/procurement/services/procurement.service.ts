import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import {
  allocateShortageForVariant,
  computeShortages,
} from "@/modules/procurement/procurement.allocate";
import type {
  AllocationLine,
  ProcurementPlan,
  VariantDemandRow,
  VendorProductOffer,
} from "@/modules/procurement/types";

/** Order statuses that count toward procurement demand (unfulfilled pipeline). */
const DEMAND_STATUSES = ["pending", "processing"] as const;

export async function aggregatePendingOrderDemand(): Promise<VariantDemandRow[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data: orderRows, error: oErr } = await supabase
    .from("orders")
    .select("id")
    .in("status", [...DEMAND_STATUSES]);

  if (oErr) throw new Error(oErr.message);

  const orderIds = (orderRows ?? []).map((r) => r.id as string).filter(Boolean);
  if (orderIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from("order_items")
    .select("variant_id,quantity")
    .in("order_id", orderIds);

  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    const vid = r.variant_id as string | null;
    if (!vid) continue;
    const q = Number((r as { quantity?: number }).quantity ?? 0);
    map.set(vid, (map.get(vid) ?? 0) + q);
  }

  return [...map.entries()].map(([variant_id, demand_qty]) => ({
    variant_id,
    demand_qty,
  }));
}

export async function getInventoryStockForVariants(
  variantIds: string[],
): Promise<Map<string, number>> {
  await requireAdminOrManagerProfile();
  const map = new Map<string, number>();
  if (variantIds.length === 0) return map;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("variant_id,stock")
    .in("variant_id", variantIds);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    map.set(
      row.variant_id as string,
      Math.max(0, Math.floor(Number((row as { stock?: number }).stock ?? 0))),
    );
  }
  return map;
}

export async function getVendorProductOffersForVariants(
  variantIds: string[],
): Promise<VendorProductOffer[]> {
  await requireAdminOrManagerProfile();
  if (variantIds.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendor_products")
    .select("id,vendor_id,variant_id,base_price,stock")
    .in("variant_id", variantIds)
    .gt("stock", 0);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    vendor_id: r.vendor_id as string,
    variant_id: r.variant_id as string,
    base_price: Number(r.base_price ?? 0),
    stock: Math.max(0, Math.floor(Number(r.stock ?? 0))),
  }));
}

function groupOffersByVariant(
  offers: VendorProductOffer[],
): Map<string, VendorProductOffer[]> {
  const m = new Map<string, VendorProductOffer[]>();
  for (const o of offers) {
    const list = m.get(o.variant_id) ?? [];
    list.push(o);
    m.set(o.variant_id, list);
  }
  for (const [k, list] of m) {
    list.sort((a, b) => a.base_price - b.base_price);
    m.set(k, list);
  }
  return m;
}

function normalizeAllocationLine(line: AllocationLine): AllocationLine {
  const qty = Math.max(0, Math.floor(Number(line.allocated_qty)));
  const price = Number(line.base_price);
  return {
    ...line,
    allocated_qty: qty,
    total_cost: qty * price,
  };
}

function buildPlan(allocations: AllocationLine[]): ProcurementPlan {
  const normalized = allocations.map(normalizeAllocationLine);
  const vendorIds = [...new Set(normalized.map((a) => a.vendor_id))];
  const byVendorMap = new Map<string, AllocationLine[]>();
  for (const a of normalized) {
    const list = byVendorMap.get(a.vendor_id) ?? [];
    list.push(a);
    byVendorMap.set(a.vendor_id, list);
  }

  return {
    allocations: normalized,
    by_vendor: vendorIds.map((vendor_id) => {
      const lines = byVendorMap.get(vendor_id) ?? [];
      const total_cost = lines.reduce((s, l) => s + l.total_cost, 0);
      const total_allocated_quantity = lines.reduce(
        (s, l) => s + l.allocated_qty,
        0,
      );
      return {
        vendor_id,
        vendor_name: null,
        lines,
        total_allocated_quantity,
        total_cost,
      };
    }),
    system_total_cost: normalized.reduce((s, a) => s + a.total_cost, 0),
  };
}

/**
 * Rebuilds plan totals and vendor grouping from edited allocation lines (service-only math).
 */
export async function rebuildProcurementPlanFromAllocations(
  allocations: AllocationLine[],
): Promise<ProcurementPlan> {
  await requireAdminOrManagerProfile();
  const plan = buildPlan(allocations);
  await attachProcurementDisplayLabels(plan);
  return plan;
}

export async function runProcurementEngine(): Promise<ProcurementPlan> {
  await requireAdminOrManagerProfile();

  const demandRows = await aggregatePendingOrderDemand();
  const demand = new Map(demandRows.map((d) => [d.variant_id, d.demand_qty]));
  const variantIds = [...demand.keys()];

  const stockMap = await getInventoryStockForVariants(variantIds);
  const shortages = computeShortages(demand, stockMap);

  if (shortages.length === 0) {
    return buildPlan([]);
  }

  const shortageIds = shortages.map((s) => s.variant_id);
  const offers = await getVendorProductOffersForVariants(shortageIds);
  const byVariant = groupOffersByVariant(offers);

  const allocations: AllocationLine[] = [];
  for (const s of shortages) {
    const offersForVariant = byVariant.get(s.variant_id) ?? [];
    const lines = allocateShortageForVariant(s.shortage_qty, offersForVariant);
    allocations.push(...lines);
  }

  const plan = buildPlan(allocations);
  await attachProcurementDisplayLabels(plan);
  return plan;
}

async function attachProcurementDisplayLabels(plan: ProcurementPlan): Promise<void> {
  const vendorIds = [...new Set(plan.allocations.map((a) => a.vendor_id))];
  const variantIds = [...new Set(plan.allocations.map((a) => a.variant_id))];
  if (vendorIds.length === 0 && variantIds.length === 0) return;

  const supabase = await createSupabaseServerClient();

  const [vendorsRes, variantsRes] = await Promise.all([
    vendorIds.length > 0
      ? supabase.from("vendors").select("id,name").in("id", vendorIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[], error: null }),
    variantIds.length > 0
      ? supabase
          .from("product_variants")
          .select("id,name,products(name)")
          .in("id", variantIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  if (vendorsRes.error) throw new Error(vendorsRes.error.message);
  if (variantsRes.error) throw new Error(variantsRes.error.message);

  const nameByVendorId = new Map(
    (vendorsRes.data ?? []).map((r) => [r.id as string, (r.name as string | null) ?? null]),
  );

  const labelByVariantId = new Map<
    string,
    { product_name: string | null; variant_name: string | null }
  >();
  for (const row of variantsRes.data ?? []) {
    const id = row.id as string;
    const variant_name = (row.name as string | null) ?? null;
    const products = row.products as { name?: string } | null;
    const product_name = products?.name ?? null;
    labelByVariantId.set(id, { product_name, variant_name });
  }

  for (const g of plan.by_vendor) {
    g.vendor_name = nameByVendorId.get(g.vendor_id) ?? null;
  }

  for (const line of plan.allocations) {
    line.vendor_name = nameByVendorId.get(line.vendor_id) ?? null;
    const v = labelByVariantId.get(line.variant_id);
    line.product_name = v?.product_name ?? null;
    line.variant_name = v?.variant_name ?? null;
  }
}

