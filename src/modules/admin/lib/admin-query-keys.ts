/** Central TanStack Query keys for admin API routes. */
export const fixedAssetsListQueryKey = (
  page: number,
  storeId: string,
  search: string,
) => ["admin", "fixed-assets", page, storeId || "all", search || ""] as const;

export const fixedAssetDetailQueryKey = (id: string) =>
  ["admin", "fixed-asset", id] as const;

export const adminQueryKeys = {
  session: () => ["admin", "session"] as const,
  erpContext: () => ["admin", "erp-context"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  navBadges: () => ["admin", "nav-badges"] as const,
  products: (page: number, categoryId: string | null, storeId?: string | null) =>
    ["admin", "products", page, categoryId ?? "all", storeId ?? "all"] as const,
  vendors: (page: number) => ["admin", "vendors", page] as const,
  inventory: (page: number) => ["admin", "inventory", page] as const,
  orders: (status: string, userId: string | null, page: number) =>
    ["admin", "orders", status, userId ?? "", page] as const,
  salesOrders: (status: string, userId: string | null, page: number) =>
    ["admin", "sales-orders", status, userId ?? "", page] as const,
  purchaseOrders: (status: string, vendorId: string | null, page: number) =>
    ["admin", "purchase-orders", status, vendorId ?? "", page] as const,
  users: (tab: string, segment: string, page: number) =>
    ["admin", "users", tab, segment, page] as const,
  delivery: () => ["admin", "delivery"] as const,
  productDetail: (id: string) => ["admin", "product", id] as const,
  productPricingSuggestions: (id: string) => ["admin", "product", id, "pricing-suggestions"] as const,
  orderDetail: (id: string) => ["admin", "order", id] as const,
  vendorDetail: (id: string) => ["admin", "vendor", id] as const,
  purchaseOrderDetail: (id: string) => ["admin", "purchase-order", id] as const,
  customerDetail: (id: string, txPage: number) => ["admin", "customer", id, txPage] as const,
  customersList: (page: number) => ["admin", "customers", "list", page] as const,
  procurement: () => ["admin", "procurement"] as const,
  searchIndex: () => ["admin", "search-index"] as const,
  recentActivity: () => ["admin", "recent-activity"] as const,
  taxRates: () => ["admin", "tax-rates"] as const,
  itemUnits: () => ["admin", "item-units"] as const,
  fixedAssets: fixedAssetsListQueryKey,
  fixedAssetDetail: fixedAssetDetailQueryKey,
  appSettings: () => ["admin", "app-settings"] as const,
  analytics: (queryString: string) =>
    ["admin", "analytics", queryString] as const,
  accountsPicker: (storeId?: string | null) =>
    ["admin", "accounts", "picker", storeId ?? "active"] as const,
};
