import type { ComponentType } from "react";
import {
  Award,
  BarChart3,
  Building2,
  ClipboardList,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  Package,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserCircle,
  Users,
  Warehouse,
} from "lucide-react";

export type AdminNavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: "NEW" | "Coming soon";
  keywords?: string[];
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_DASHBOARD_ITEM: AdminNavItem = {
  name: "Dashboard",
  href: "/admin",
  icon: LayoutDashboard,
  keywords: ["home", "overview", "analytics"],
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Catalog",
    items: [
      { name: "Products", href: "/admin/products", icon: Package, keywords: ["catalog", "items", "sku"] },
      { name: "Categories", href: "/admin/categories", icon: FolderTree, badge: "NEW", keywords: ["taxonomy"] },
      { name: "Brands", href: "/admin/brands", icon: Award, keywords: ["manufacturer", "label"] },
    ],
  },
  {
    label: "Sales & Fulfillment",
    items: [
      { name: "Orders", href: "/admin/orders", icon: ClipboardList, keywords: ["sales", "fulfillment"] },
      {
        name: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        badge: "NEW",
        keywords: ["insights", "funnel", "revenue", "kpi", "reports"],
      },
      { name: "Delivery", href: "/admin/delivery", icon: Truck },
      { name: "Billing", href: "/admin/billing", icon: Receipt, keywords: ["invoice", "pos"] },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { name: "Inventory", href: "/admin/inventory", icon: Warehouse, keywords: ["stock", "warehouse"] },
      { name: "Procurement", href: "/admin/procurement", icon: ShoppingCart, keywords: ["buying", "restock"] },
      { name: "Purchase Orders", href: "/admin/purchase-orders", icon: Package, keywords: ["po", "vendor orders"] },
      { name: "Vendors", href: "/admin/vendors", icon: Building2, keywords: ["suppliers"] },
    ],
  },
  {
    label: "System & Users",
    items: [
      { name: "Customers", href: "/admin/customers", icon: UserCircle, keywords: ["buyers", "accounts"] },
      { name: "Team & Users", href: "/admin/users", icon: Users, keywords: ["staff", "admin", "delivery"] },
      { name: "Settings", href: "/admin/config", icon: Settings, keywords: ["settings", "configuration"] },
    ],
  },
];

/** Standalone admin pages not shown in the primary sidebar. */
export const ADMIN_EXTRA_NAV_ITEMS: AdminNavItem[] = [
  { name: "Finance Reports", href: "/admin/finance", icon: TrendingUp, keywords: ["revenue", "reports", "p&l"] },
  { name: "Returns", href: "/admin/returns", icon: RotateCcw, keywords: ["refunds", "rma"] },
  { name: "Tax Configuration", href: "/admin/config/tax", icon: Settings, keywords: ["gst", "tax rates"] },
  { name: "Security", href: "/admin/config/security", icon: KeyRound, keywords: ["password", "reset"] },
];

export function getAllAdminNavItems(): AdminNavItem[] {
  return [
    ADMIN_DASHBOARD_ITEM,
    ...ADMIN_NAV_SECTIONS.flatMap((section) => section.items),
    ...ADMIN_EXTRA_NAV_ITEMS,
  ];
}
