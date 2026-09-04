import type { ComponentType } from "react";
import {
  BookOpen,
  Building2,
  Calculator,
  ClipboardList,
  FileText,
  FolderTree,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Package,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Tag,
  TrendingUp,
  Truck,
  UserCircle,
  Users,
  Wallet,
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
  icon: ComponentType<{ size?: number; className?: string }>;
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
    label: "Banking",
    icon: Landmark,
    items: [
      { name: "Cash Accounts", href: "/admin/erp/banking", icon: Wallet, keywords: ["cash", "bank accounts"] },
      { name: "Payment Statement", href: "/admin/erp/payment-statement", icon: FileText, keywords: ["statement", "payments"] },
      { name: "Profit Withdrawal", href: "/admin/erp/profit-withdrawals", icon: Receipt, keywords: ["profit", "withdrawal"] },
    ],
  },
  {
    label: "Assets",
    icon: Package,
    items: [
      { name: "Fixed Assets", href: "/admin/erp/fixed-assets", icon: Building2, keywords: ["asset", "equipment"] },
    ],
  },
  {
    label: "Items",
    icon: Tag,
    items: [
      { name: "Items", href: "/admin/products", icon: Package, keywords: ["catalog", "items", "sku", "products"] },
      { name: "Categories", href: "/admin/categories", icon: FolderTree, keywords: ["taxonomy", "category"] },
      { name: "Brands", href: "/admin/brands", icon: Tag, keywords: ["brand", "manufacturer"] },
      { name: "Item Unit", href: "/admin/item-units", icon: Layers, keywords: ["uom", "unit"] },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    items: [
      { name: "Online Sales", href: "/admin/orders", icon: ShoppingCart, keywords: ["online", "buyhub", "pos", "app orders"] },
      { name: "Fulfillment Queue", href: "/admin/erp/fulfillment-queue", icon: Truck, keywords: ["fulfillment", "assign store", "ship", "pending assignment"] },
      { name: "Customer", href: "/admin/customers", icon: UserCircle, keywords: ["buyers", "accounts", "customer"] },
      { name: "Estimate", href: "/admin/erp/estimates", icon: FileText, keywords: ["quote", "proposal"] },
      { name: "Sales Orders", href: "/admin/erp/sales-orders", icon: ClipboardList, keywords: ["so", "sales order", "fulfillment commitment"] },
      { name: "Invoices", href: "/admin/erp/invoices", icon: FileText, keywords: ["billing", "tax invoice"] },
      { name: "Recurring Invoices", href: "/admin/erp/recurring-invoices", icon: RotateCcw, keywords: ["recurring", "subscription", "repeat", "retainer"] },
      { name: "Payment Received", href: "/admin/erp/payments", icon: Receipt, keywords: ["payment received", "ar"] },
      { name: "Payment Bulk", href: "/admin/erp/customer-bulk-payments", icon: Receipt, keywords: ["bulk payment", "payment bulk"] },
      { name: "Credit Note", href: "/admin/erp/credit-notes", icon: RotateCcw, keywords: ["cn", "credit"] },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingBasket,
    items: [
      { name: "Expenses", href: "/admin/erp/expenses", icon: Receipt, keywords: ["expense"] },
      { name: "Purchase Orders", href: "/admin/purchase-orders", icon: Package, keywords: ["po", "vendor orders"] },
      { name: "Purchase Bills", href: "/admin/erp/purchase-bills", icon: FileText, keywords: ["purchase entry", "purchase bills", "vendor bill"] },
      { name: "Recurring Bills", href: "/admin/erp/recurring-bills", icon: RotateCcw, keywords: ["recurring", "subscription", "repeat"] },
      { name: "Payment Made", href: "/admin/erp/supplier-payments", icon: Receipt, keywords: ["payment made", "supplier payment"] },
      { name: "Payment Made Bulk", href: "/admin/erp/supplier-bulk-payments", icon: Receipt, keywords: ["bulk payment"] },
      { name: "Vendor", href: "/admin/vendors", icon: Building2, keywords: ["suppliers", "vendor"] },
      { name: "Vendor Credits", href: "/admin/erp/vendor-credits", icon: RotateCcw, keywords: ["supplier credit"] },
      { name: "Landed Cost Item Master", href: "/admin/erp/landed-costs", icon: Layers, keywords: ["landed cost"] },
    ],
  },
  {
    label: "Inventory",
    icon: LayoutGrid,
    items: [
      { name: "Stock Transfer Statement", href: "/admin/erp/transfer-statement", icon: FileText, keywords: ["transfer statement", "statement"] },
      { name: "Stock Transfer Requests", href: "/admin/erp/transfer-requests", icon: Truck, keywords: ["transfer request"] },
      { name: "Stock Transfer Approvals", href: "/admin/erp/transfer-approvals", icon: ClipboardList, keywords: ["transfer approval"] },
      { name: "Stock Transfer Bulk Payment", href: "/admin/erp/transfer-bulk-payments", icon: Receipt, keywords: ["transfer payment"] },
      { name: "Item Transactions", href: "/admin/erp/item-transactions", icon: ListOrdered, keywords: ["stock movements"] },
      { name: "Stock Adjustment", href: "/admin/erp/stock-adjustments", icon: Layers, keywords: ["adjustment"] },
      { name: "Stores", href: "/admin/erp/stores", icon: Building2, keywords: ["branch", "store"] },
    ],
  },
  {
    label: "Accounts",
    icon: BookOpen,
    items: [
      { name: "Account Type", href: "/admin/erp/account-types", icon: Layers, keywords: ["ledger category"] },
      { name: "Accounts", href: "/admin/erp/accounts", icon: Wallet, keywords: ["chart of accounts", "ledger"] },
    ],
  },
  {
    label: "Reports",
    icon: TrendingUp,
    items: [
      { name: "All Reports", href: "/admin/erp/reports", icon: FileText, keywords: ["reports", "p&l", "trial balance", "ledger"] },
      { name: "Financial Summary", href: "/admin/erp/reports/finance-summary", icon: TrendingUp, keywords: ["dashboard", "kpi"] },
      { name: "Reconciliation", href: "/admin/erp/reconciliation", icon: ClipboardList, keywords: ["reconcile", "audit"] },
      { name: "Online Store Analytics", href: "/admin/finance", icon: ShoppingCart, keywords: ["online", "orders", "margin"] },
    ],
  },
  {
    label: "HR",
    icon: Users,
    items: [
      { name: "Employees", href: "/admin/erp/employees", icon: Users, keywords: ["staff", "employee"] },
      { name: "Salary Payments", href: "/admin/erp/salary-payments", icon: Receipt, keywords: ["salary", "payroll"] },
      { name: "Salary Bulk Payments", href: "/admin/erp/salary-bulk-payments", icon: Receipt, keywords: ["bulk salary"] },
      { name: "Pay Slips", href: "/admin/erp/pay-slips", icon: FileText, keywords: ["payslip"] },
      { name: "Opening Balance - Employee", href: "/admin/erp/employee-opening-balances", icon: Wallet, keywords: ["opening balance", "employee"] },
    ],
  },
  {
    label: "VAT",
    icon: Calculator,
    items: [
      { name: "VAT Returns", href: "/admin/erp/vat-returns", icon: Receipt, keywords: ["vat", "tax return"] },
      { name: "VAT Payments", href: "/admin/erp/vat-payments", icon: Receipt, keywords: ["vat payment", "tax payment"] },
    ],
  },
];

/** Standalone admin pages not shown in the primary sidebar. */
export const ADMIN_EXTRA_NAV_ITEMS: AdminNavItem[] = [
  { name: "Inventory", href: "/admin/inventory", icon: Warehouse, keywords: ["stock", "warehouse"] },
  { name: "Procurement", href: "/admin/procurement", icon: ShoppingCart, keywords: ["buying", "restock"] },
  { name: "Journal Entries", href: "/admin/erp/journal-entries", icon: FileText, keywords: ["journal", "gl"] },
  { name: "Team & Users", href: "/admin/users", icon: Users, keywords: ["staff", "admin", "delivery"] },
  { name: "Settings", href: "/admin/config", icon: Settings, keywords: ["settings", "configuration"] },
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
