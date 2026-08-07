import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import {
  allocateShortageForVariant,
  computeReorderNeeds,
  type InventoryReorderRow,
} from "@/modules/procurement/procurement.allocate";
import type {
  AllocationLine,
  ProcurementDefaults,
  ProcurementPlan,
  ProcurementSourcingNeed,
  VariantDemandRow,
  VendorProductOffer,
} from "@/modules/procurement/types";
import type { ProcurementInsights } from "@/common/admin/types";

/** Order statuses that count toward procurement demand (unfulfilled pipeline). */
const DEMAND_STATUSES = ["pending", "processing"] as const;

/** PO statuses that count as inbound stock (not yet received). */
const OPEN_PO_STATUSES = ["pending", "accepted"] as const;

export const DEFAULT_REORDER_POINT = 10;
export const DEFAULT_REORDER_QUANTITY = 10;

export async function getProcurementDefaults(): Promise<ProcurementDefaults> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("procurement_settings")
    .select("default_reorder_point,default_reorder_quantity")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    default_reorder_point: Math.max(
      0,
      Math.floor(Number(data?.default_reorder_point ?? DEFAULT_REORDER_POINT)),
    ),
    default_reorder_quantity: Math.max(
      1,
      Math.floor(Number(data?.default_reorder_quantity ?? DEFAULT_REORDER_QUANTITY)),
    ),
  };
}

export async function updateProcurementDefaults(
  settings: ProcurementDefaults,
): Promise<ProcurementDefaults> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const patch = {
    default_reorder_point: Math.max(0, Math.floor(settings.default_reorder_point)),
    default_reorder_quantity: Math.max(1, Math.floor(settings.default_reorder_quantity)),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("procurement_settings")
    .upsert({ id: 1, ...patch });

  if (error) throw new Error(error.message);
  return patch;
}

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

export async function getOpenPurchaseOrderQuantitiesByVariant(): Promise<
  Map<string, number>
> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data: poRows, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id")
    .in("status", [...OPEN_PO_STATUSES]);

  if (poErr) throw new Error(poErr.message);

  const poIds = (poRows ?? []).map((r) => r.id as string).filter(Boolean);
  const map = new Map<string, number>();
  if (poIds.length === 0) return map;

  const { data: items, error: itemErr } = await supabase
    .from("purchase_order_items")
    .select("variant_id,quantity")
    .in("po_id", poIds);

  if (itemErr) throw new Error(itemErr.message);

  for (const row of items ?? []) {
    const vid = row.variant_id as string | null;
    if (!vid) continue;
    const qty = Math.max(0, Math.floor(Number(row.quantity ?? 0)));
    if (qty <= 0) continue;
    map.set(vid, (map.get(vid) ?? 0) + qty);
  }

  return map;
}

export async function getInventoryReorderRows(
  onOrderByVariant?: Map<string, number>,
): Promise<InventoryReorderRow[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("inventory")
    .select(
      "variant_id,stock,reorder_point,last_reorder_quantity",
    );

  if (error) throw new Error(error.message);

  const onOrder = onOrderByVariant ?? new Map<string, number>();

  return (data ?? []).map((row) => ({
    variant_id: row.variant_id as string,
    stock: Math.max(0, Math.floor(Number(row.stock ?? 0))),
    reorder_point: Math.max(
      0,
      Math.floor(Number(row.reorder_point ?? DEFAULT_REORDER_POINT)),
    ),
    last_reorder_quantity:
      row.last_reorder_quantity != null
        ? Math.max(1, Math.floor(Number(row.last_reorder_quantity)))
        : null,
    on_order_qty: Math.max(0, Math.floor(onOrder.get(row.variant_id as string) ?? 0)),
  }));
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

function buildPlan(
  allocations: AllocationLine[],
  needs_sourcing: ProcurementSourcingNeed[],
  defaults: ProcurementDefaults,
): ProcurementPlan {
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
    needs_sourcing,
    defaults,
  };
}

/**
 * Rebuilds plan totals and vendor grouping from edited allocation lines (service-only math).
 */
export async function rebuildProcurementPlanFromAllocations(
  allocations: AllocationLine[],
  needs_sourcing: ProcurementSourcingNeed[] = [],
  defaults?: ProcurementDefaults,
): Promise<ProcurementPlan> {
  await requireAdminOrManagerProfile();
  const resolvedDefaults = defaults ?? (await getProcurementDefaults());
  const plan = buildPlan(allocations, needs_sourcing, resolvedDefaults);
  await attachProcurementDisplayLabels(plan);
  return plan;
}

function buildSourcingNeed(
  need: {
    variant_id: string;
    shortage_qty: number;
    inventory_stock: number;
    reorder_point?: number;
    suggested_order_qty?: number;
    on_order_qty?: number;
    effective_stock?: number;
  },
  uncoveredQty: number,
  reason: ProcurementSourcingNeed["reason"],
): ProcurementSourcingNeed {
  return {
    variant_id: need.variant_id,
    inventory_stock: need.inventory_stock,
    on_order_qty: need.on_order_qty ?? 0,
    effective_stock: need.effective_stock ?? need.inventory_stock,
    reorder_point: need.reorder_point ?? 0,
    suggested_order_qty: need.suggested_order_qty ?? need.shortage_qty,
    uncovered_qty: uncoveredQty,
    reason,
  };
}

export async function runProcurementEngine(): Promise<ProcurementPlan> {
  await requireAdminOrManagerProfile();

  const [onOrderByVariant, defaults] = await Promise.all([
    getOpenPurchaseOrderQuantitiesByVariant(),
    getProcurementDefaults(),
  ]);

  const inventoryRows = await getInventoryReorderRows(onOrderByVariant);
  const reorderNeeds = computeReorderNeeds(
    inventoryRows,
    defaults.default_reorder_quantity,
  );

  if (reorderNeeds.length === 0) {
    return buildPlan([], [], defaults);
  }

  const needIds = reorderNeeds.map((s) => s.variant_id);
  const offers = await getVendorProductOffersForVariants(needIds);
  const byVariant = groupOffersByVariant(offers);

  const allocations: AllocationLine[] = [];
  const needs_sourcing: ProcurementSourcingNeed[] = [];

  for (const need of reorderNeeds) {
    const offersForVariant = byVariant.get(need.variant_id) ?? [];
    const lines = allocateShortageForVariant(need.shortage_qty, offersForVariant);
    const allocatedTotal = lines.reduce((s, l) => s + l.allocated_qty, 0);
    const uncovered = Math.max(0, need.shortage_qty - allocatedTotal);

    for (const line of lines) {
      allocations.push({
        ...line,
        inventory_stock: need.inventory_stock,
        reorder_point: need.reorder_point,
        suggested_order_qty: need.suggested_order_qty,
        on_order_qty: need.on_order_qty,
        effective_stock: need.effective_stock,
      });
    }

    if (offersForVariant.length === 0) {
      needs_sourcing.push(
        buildSourcingNeed(need, need.shortage_qty, "no_vendor"),
      );
    } else if (uncovered > 0) {
      needs_sourcing.push(
        buildSourcingNeed(need, uncovered, "insufficient_vendor_stock"),
      );
    }
  }

  const plan = buildPlan(allocations, needs_sourcing, defaults);
  await attachProcurementDisplayLabels(plan);
  return plan;
}

async function attachVariantLabels(
  variantIds: string[],
): Promise<
  Map<string, { product_name: string | null; variant_name: string | null }>
> {
  const labelByVariantId = new Map<
    string,
    { product_name: string | null; variant_name: string | null }
  >();
  if (variantIds.length === 0) return labelByVariantId;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,name,products(name)")
    .in("id", variantIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const id = row.id as string;
    const variant_name = (row.name as string | null) ?? null;
    const products = row.products as { name?: string } | null;
    const product_name = products?.name ?? null;
    labelByVariantId.set(id, { product_name, variant_name });
  }

  return labelByVariantId;
}

async function attachProcurementDisplayLabels(plan: ProcurementPlan): Promise<void> {
  const vendorIds = [...new Set(plan.allocations.map((a) => a.vendor_id))];
  const allocationVariantIds = [...new Set(plan.allocations.map((a) => a.variant_id))];
  const sourcingVariantIds = plan.needs_sourcing.map((n) => n.variant_id);
  const variantIds = [...new Set([...allocationVariantIds, ...sourcingVariantIds])];

  if (vendorIds.length === 0 && variantIds.length === 0) return;

  const supabase = await createSupabaseServerClient();

  const [vendorsRes, labelByVariantId] = await Promise.all([
    vendorIds.length > 0
      ? supabase.from("vendors").select("id,name").in("id", vendorIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[], error: null }),
    attachVariantLabels(variantIds),
  ]);

  if (vendorsRes.error) throw new Error(vendorsRes.error.message);

  const nameByVendorId = new Map(
    (vendorsRes.data ?? []).map((r) => [r.id as string, (r.name as string | null) ?? null]),
  );

  for (const g of plan.by_vendor) {
    g.vendor_name = nameByVendorId.get(g.vendor_id) ?? null;
  }

  for (const line of plan.allocations) {
    line.vendor_name = nameByVendorId.get(line.vendor_id) ?? null;
    const v = labelByVariantId.get(line.variant_id);
    line.product_name = v?.product_name ?? null;
    line.variant_name = v?.variant_name ?? null;
  }

  for (const need of plan.needs_sourcing) {
    const v = labelByVariantId.get(need.variant_id);
    need.product_name = v?.product_name ?? null;
    need.variant_name = v?.variant_name ?? null;
  }
}

function countInventoryHealth(rows: InventoryReorderRow[]) {
  let critical = 0;
  let low = 0;
  let healthy = 0;

  for (const row of rows) {
    const stock = row.stock;
    const effective = stock + Math.max(0, Math.floor(row.on_order_qty ?? 0));
    if (stock < 1) {
      critical += 1;
    } else if (effective < row.reorder_point) {
      low += 1;
    } else {
      healthy += 1;
    }
  }

  return { critical, low, healthy };
}

export async function getProcurementInsights(): Promise<ProcurementInsights> {
  await requireAdminOrManagerProfile();

  const [onOrderByVariant, demandRows, defaults] = await Promise.all([
    getOpenPurchaseOrderQuantitiesByVariant(),
    aggregatePendingOrderDemand(),
    getProcurementDefaults(),
  ]);

  const inventoryRows = await getInventoryReorderRows(onOrderByVariant);
  const availableInventoryUnits = inventoryRows.reduce((sum, row) => sum + row.stock, 0);
  const reorderNeeds = computeReorderNeeds(
    inventoryRows,
    defaults.default_reorder_quantity,
  );
  const shortageUnits = reorderNeeds.reduce((s, r) => s + r.shortage_qty, 0);
  const { critical, low } = countInventoryHealth(inventoryRows);

  const pipelineDemandUnits = demandRows.reduce((s, r) => s + r.demand_qty, 0);

  return {
    pipelineDemandUnits,
    availableInventoryUnits,
    shortageUnits,
    pipelineShortageVariants: reorderNeeds.length,
    demandTodayUnits: 0,
    productsNeedingRestock: critical + low,
    defaultReorderPoint: defaults.default_reorder_point,
    defaultReorderQuantity: defaults.default_reorder_quantity,
  };
}

export async function countVariantsBelowReorderPoint(): Promise<number> {
  await requireAdminOrManagerProfile();
  const [onOrderByVariant, defaults] = await Promise.all([
    getOpenPurchaseOrderQuantitiesByVariant(),
    getProcurementDefaults(),
  ]);
  const inventoryRows = await getInventoryReorderRows(onOrderByVariant);
  return computeReorderNeeds(inventoryRows, defaults.default_reorder_quantity).length;
}
