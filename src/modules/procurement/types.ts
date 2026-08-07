export interface VariantDemandRow {
  variant_id: string;
  demand_qty: number;
}

export interface ShortageRow {
  variant_id: string;
  shortage_qty: number;
  inventory_stock: number;
  /** Set when shortage comes from reorder-point logic. */
  reorder_point?: number;
  suggested_order_qty?: number;
  on_order_qty?: number;
  effective_stock?: number;
}

export interface ProcurementSourcingNeed {
  variant_id: string;
  product_name?: string | null;
  variant_name?: string | null;
  inventory_stock: number;
  on_order_qty: number;
  effective_stock: number;
  reorder_point: number;
  suggested_order_qty: number;
  uncovered_qty: number;
  reason: "no_vendor" | "insufficient_vendor_stock";
}

export interface ProcurementDefaults {
  default_reorder_point: number;
  default_reorder_quantity: number;
}

export interface VendorProductOffer {
  id: string;
  vendor_id: string;
  variant_id: string;
  base_price: number;
  stock: number;
}

export interface AllocationLine {
  vendor_id: string;
  variant_id: string;
  vendor_product_id: string;
  allocated_qty: number;
  base_price: number;
  total_cost: number;
  /** Set server-side for admin UI (procurement plan table). */
  vendor_name?: string | null;
  product_name?: string | null;
  variant_name?: string | null;
  inventory_stock?: number;
  reorder_point?: number;
  suggested_order_qty?: number;
  on_order_qty?: number;
  effective_stock?: number;
}

export interface ProcurementPlanVendorGroup {
  vendor_id: string;
  vendor_name: string | null;
  lines: AllocationLine[];
  /** Sum of allocated_qty for this vendor. */
  total_allocated_quantity: number;
  total_cost: number;
}

export interface ProcurementPlan {
  allocations: AllocationLine[];
  by_vendor: ProcurementPlanVendorGroup[];
  system_total_cost: number;
  needs_sourcing: ProcurementSourcingNeed[];
  defaults: ProcurementDefaults;
}
