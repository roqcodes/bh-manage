/** Central TanStack Query keys for admin API routes. */
export const adminQueryKeys = {
  session: () => ["admin", "session"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  products: (page: number) => ["admin", "products", page] as const,
  vendors: (page: number) => ["admin", "vendors", page] as const,
  inventory: (page: number) => ["admin", "inventory", page] as const,
  orders: (status: string, userId: string | null, page: number) =>
    ["admin", "orders", status, userId ?? "", page] as const,
  purchaseOrders: (status: string, vendorId: string | null, page: number) =>
    ["admin", "purchase-orders", status, vendorId ?? "", page] as const,
  users: (tab: string, segment: string, page: number) =>
    ["admin", "users", tab, segment, page] as const,
  delivery: () => ["admin", "delivery"] as const,
  productDetail: (id: string) => ["admin", "product", id] as const,
  orderDetail: (id: string) => ["admin", "order", id] as const,
  vendorDetail: (id: string) => ["admin", "vendor", id] as const,
  purchaseOrderDetail: (id: string) => ["admin", "purchase-order", id] as const,
};
