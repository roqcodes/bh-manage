export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_FILTERS = [
  "all",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatusFilter = (typeof ORDER_STATUS_FILTERS)[number];

export const PAGE_SIZE = 20;

export interface Paginated<T> {
  data: T[];
  total: number;
}

// ─── Core rows ────────────────────────────────────────────────────────────────

export interface DBUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

export interface AdminUser extends DBUser {
  order_count?: number;
}

export interface Vendor {
  id: string;
  name: string | null;
  contact: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

/** Admin vendors list summary (server-computed). */
export interface VendorCatalogStats {
  total: number;
  active: number;
  inactive: number;
  /** Rows in `vendor_products` (supply lines across all vendors). */
  supplyLines: number;
}

export interface Category {
  id: string;
  name: string | null;
  parent_id: string | null;
  image_url: string | null;
  created_at: string | null;
}

export interface Product {
  id: string;
  name: string | null;
  description: string | null;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface ProductWithCategory extends Product {
  categories: Category | null;
}

/** Admin product detail “at a glance” (server-computed). */
export interface ProductAtGlanceMetrics {
  centralStockTotal: number;
  livePriceMin: number | null;
  livePriceMax: number | null;
  variantsWithLivePrice: number;
}

export interface VariantImage {
  id: string;
  variant_id: string;
  url: string;
  is_preview: boolean;
  sort_order: number;
  created_at: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string | null;
  name: string | null;
  price: number | null;
  mrp: number | null;
  created_at: string | null;
  /** Ordered images for this variant; preview first. Empty when none. */
  images: VariantImage[];
}

export interface VariantWithProduct extends ProductVariant {
  products: { id: string; name: string | null } | null;
}

export interface InventoryWithVariant {
  variant_id: string;
  stock: number | null;
  updated_at: string | null;
  product_variants: {
    id: string;
    name: string | null;
    products: { id: string; name: string | null } | null;
  } | null;
}

/** Admin inventory list summary (server-computed). */
export interface InventoryCatalogStats {
  totalSkus: number;
  /** Stock is null or below 1. */
  criticalSkus: number;
  /** 1–9 units. */
  lowStockSkus: number;
  /** ≥ 10 units. */
  healthySkus: number;
}

export interface VendorProduct {
  id: string;
  vendor_id: string | null;
  variant_id: string | null;
  base_price: number;
  stock: number | null;
  created_at: string | null;
}

export interface VendorProductWithVariant extends VendorProduct {
  product_variants: {
    id: string;
    name: string | null;
    products: { id: string; name: string | null } | null;
  } | null;
}

// ─── Order types ──────────────────────────────────────────────────────────────

export interface OrderUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface Order {
  id: string;
  created_at: string | null;
  status: OrderStatus;
  total_amount: number | null;
  users: OrderUser | null;
}

/** Admin orders list summary (server-computed, all orders). */
export interface OrderCatalogStats {
  totalOrders: number;
  pendingCount: number;
  processingCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
}

export interface OrderItem {
  id: string;
  order_id: string | null;
  variant_id: string | null;
  quantity: number | null;
  price: number | null;
  product_name: string | null;
  vendor_id: string | null;
  base_price: number | null;
  final_price: number | null;
  margin_amount: number | null;
  created_at: string | null;
}

export interface OrderWithItems {
  id: string;
  created_at: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  users: OrderUser | null;
  order_items: OrderItem[];
}

// ─── Purchase orders (vendor supply) ──────────────────────────────────────────

export const PURCHASE_ORDER_STATUS_FILTERS = [
  "all",
  "pending",
  "accepted",
  "delivered",
  "cancelled",
] as const;

export type PurchaseOrderStatusFilter =
  (typeof PURCHASE_ORDER_STATUS_FILTERS)[number];

export interface AdminPurchaseOrderListRow {
  id: string;
  vendor_id: string | null;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
  vendors: { name: string | null } | null;
}

/** Admin purchase-order list summary (server-computed, all POs). */
export interface PurchaseOrderCatalogStats {
  totalPurchaseOrders: number;
  pendingCount: number;
  acceptedCount: number;
  deliveredCount: number;
  cancelledCount: number;
}

export interface AdminPurchaseOrderItemRow {
  id: string;
  variant_id: string | null;
  quantity: number | null;
  price: number | null;
  product_variants: {
    id: string;
    name: string | null;
    products: { id: string; name: string | null } | null;
  } | null;
}

export interface AdminPurchaseOrderDetail {
  id: string;
  vendor_id: string | null;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
  vendors: {
    id: string;
    name: string | null;
    contact: string | null;
  } | null;
  purchase_order_items: AdminPurchaseOrderItemRow[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  dailyRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
}

export type DashboardAlertSeverity = "critical" | "warning" | "attention";

export interface DashboardAlert {
  id: string;
  label: string;
  count: number;
  severity: DashboardAlertSeverity;
  href: string;
}

/** Customer order counts by status (DB pipeline). */
export interface OrderPipelineCounts {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
}

export interface BusinessMetrics {
  revenueToday: number;
  marginToday: number;
  ordersToday: number;
  averageOrderValue: number;
}

export interface ProcurementInsights {
  /** Units on pending + processing customer orders (procurement engine demand). */
  pipelineDemandUnits: number;
  /** Sum of central inventory stock across tracked variants. */
  availableInventoryUnits: number;
  /** Units short vs central inventory for pipeline demand by variant. */
  shortageUnits: number;
  /** Distinct variants with pipeline shortage (sellable gap). */
  pipelineShortageVariants: number;
  /** Units sold today (non-cancelled orders). */
  demandTodayUnits: number;
  /** Product / variant rows needing restock (out or low stock in central inventory). */
  productsNeedingRestock: number;
}

export interface VendorSnapshotEntry {
  vendorId: string;
  name: string | null;
  /** e.g. fulfillment rate, PO reliability, avg price */
  headline: string;
  value: string;
}

export interface VendorSnapshot {
  topByFulfillment: VendorSnapshotEntry[];
  lowestAvgPrice: VendorSnapshotEntry[];
  topByPoReliability: VendorSnapshotEntry[];
}

/** Distinct catalog products with sellable central stock vs. total products in `products`. */
export interface CatalogInventoryCoverage {
  productsWithStock: number;
  totalProducts: number;
}

export interface AdminDashboardPayload {
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
  pipeline: OrderPipelineCounts;
  business: BusinessMetrics;
  procurement: ProcurementInsights;
  catalogCoverage: CatalogInventoryCoverage;
  vendors: VendorSnapshot;
  recentOrders: Order[];
}
