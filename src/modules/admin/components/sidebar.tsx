"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LayoutGrid,
  ClipboardList,
  Users,
  Building2,
  Warehouse,
  Truck,
  Settings,
  ShoppingCart,
  Package,
  LogOut,
} from "lucide-react";

import type { UserProfile } from "@/common/auth/types";
import { prefetchAdminRoute } from "@/modules/admin/lib/admin-prefetch-nav";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Marketplace", href: "/admin/products", icon: LayoutGrid },
  { name: "Orders", href: "/admin/orders", icon: ClipboardList },
  { name: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { name: "Procurement", href: "/admin/procurement", icon: ShoppingCart },
  {
    name: "Purchase orders",
    href: "/admin/purchase-orders",
    icon: Package,
  },
  { name: "Vendors", href: "/admin/vendors", icon: Building2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Delivery", href: "/admin/delivery", icon: Truck },
  { name: "Config", href: "/admin/config", icon: Settings },
] as const;

export function AdminSidebar({
  profile,
  collapsed = false,
  mobileOpen = false,
  onNavigate,
}: {
  profile: UserProfile;
  collapsed?: boolean;
  /** When false on small viewports, drawer is off-canvas; ignored at `md` and up. */
  mobileOpen?: boolean;
  /** Close mobile drawer after navigation. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const initial = profile.name?.[0]?.toUpperCase() ?? "A";

  return (
    <aside
      className={[
        "flex h-screen shrink-0 flex-col border-r border-slate-200/60 bg-white/80 shadow-[4px_0_24px_-8px_rgba(15,23,42,0.12)] backdrop-blur-xl md:shadow-none",
        /* Mobile drawer: smooth slide; desktop: quick width when collapsing */
        "fixed left-0 top-0 z-40 w-[260px] will-change-transform md:relative md:z-0 md:will-change-auto",
        "transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:ease-out",
        "md:transition-[width] md:duration-200 md:ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0",
        collapsed ? "md:w-[76px]" : "md:w-[260px]",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center py-8 transition-[padding] duration-200",
          collapsed ? "justify-center px-2" : "gap-3 px-7",
        ].join(" ")}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1e3a8a] shadow-lg shadow-[#2563EB]/20">
          <span className="text-lg font-black text-white">K</span>
        </div>
        {!collapsed ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] font-black tracking-tight text-slate-900">
              Buy<span className="text-[#2563EB]">Hub</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Management
            </span>
          </div>
        ) : null}
      </div>

      <nav
        className={[
          "flex-1 space-y-1 overflow-y-auto pb-4 transition-[padding] duration-200",
          collapsed ? "px-2" : "px-4",
        ].join(" ")}
      >
        {!collapsed ? (
          <div className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/80">
            Main Menu
          </div>
        ) : (
          <div className="mb-3 h-px bg-slate-100" aria-hidden />
        )}
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              onMouseEnter={() => void prefetchAdminRoute(queryClient, item.href)}
              onClick={() => onNavigate?.()}
              className={[
                "group relative flex items-center rounded-xl text-[14px] font-bold transition-all duration-200",
                collapsed
                  ? "justify-center px-0 py-2.5"
                  : "gap-3 px-4 py-2.5",
                active
                  ? "bg-gradient-to-r from-[#2563EB]/10 to-transparent text-[#2563EB] shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {active && (
                <div className="absolute left-0 h-5 w-1 rounded-r-full bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
              )}
              <Icon
                size={18}
                className={[
                  "shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-[#2563EB]" : "text-slate-400 group-hover:text-slate-600",
                ].join(" ")}
              />
              {collapsed ? (
                <span className="sr-only">{item.name}</span>
              ) : (
                item.name
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={[
          "border-t border-slate-200/60 transition-[padding] duration-200",
          collapsed ? "p-3" : "p-5",
        ].join(" ")}
      >
        <div
          className={[
            "group flex items-center rounded-2xl border border-slate-100 bg-slate-50/50 transition-colors hover:bg-slate-50",
            collapsed ? "flex-col gap-2 p-2" : "gap-3 p-3",
          ].join(" ")}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-black text-white shadow-md">
            {initial}
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-slate-900">
                  {profile.name ?? "Admin"}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {profile.role ?? "System"}
                </p>
              </div>
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-rose-600 hover:shadow-sm"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              title="Sign out"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-rose-600 hover:shadow-sm"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
