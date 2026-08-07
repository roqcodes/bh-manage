"use client";



import Link from "next/link";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { usePathname } from "next/navigation";

import { LogOut } from "lucide-react";



import type { AdminNavBadge } from "@/common/admin/types";
import type { UserProfile } from "@/common/auth/types";

import { cn } from "@/lib/utils";

import { adminGet } from "@/modules/admin/lib/admin-api-client";
import {
  ADMIN_DASHBOARD_ITEM,
  ADMIN_NAV_SECTIONS,
  type AdminNavItem,
  type AdminNavSection,
} from "@/modules/admin/lib/admin-nav-items";

import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

import { prefetchAdminRoute } from "@/modules/admin/lib/admin-prefetch-nav";

import { isAdminRouteHidden } from "@/modules/admin/lib/hidden-admin-routes";

const DASHBOARD_ITEM = ADMIN_DASHBOARD_ITEM;
const NAV_SECTIONS = ADMIN_NAV_SECTIONS;

type NavItem = AdminNavItem;
type NavSection = AdminNavSection;



function isNavActive(pathname: string, href: string) {

  if (href === "/admin") return pathname === "/admin";

  return pathname === href || pathname.startsWith(`${href}/`);

}



function formatAlertCount(count: number): string {

  if (count > 99) return "99+";

  return String(count);

}



function alertToneClasses(tone: AdminNavBadge["tone"]) {
  switch (tone) {
    case "critical":
      return "bg-orange-100 text-orange-700";
    case "warning":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-sky-100 text-sky-700";
  }
}

function NavAlertBadge({ alert }: { alert: AdminNavBadge }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none",
        alertToneClasses(alert.tone),
      )}
      title={`${alert.count} need attention`}
      aria-label={`${alert.count} need attention`}
    >
      {formatAlertCount(alert.count)}
    </span>
  );
}



function NavLink({

  item,

  active,

  collapsed,

  alert,

  onNavigate,

  onPrefetch,

}: {

  item: NavItem;

  active: boolean;

  collapsed: boolean;

  alert?: AdminNavBadge;

  onNavigate?: () => void;

  onPrefetch: () => void;

}) {

  const Icon = item.icon;



  return (

    <Link

      href={item.href}

      title={collapsed ? item.name : undefined}

      onMouseEnter={onPrefetch}

      onClick={() => onNavigate?.()}

      className={cn(

        "group relative flex items-center rounded-xl text-[13px] font-semibold transition-all duration-200",

        collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-3 py-2",

        active

          ? "bg-gradient-to-r from-[#2563EB]/10 to-transparent text-[#2563EB] shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset]"

          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",

      )}

    >

      {active ? (

        <div className="absolute left-0 h-5 w-1 rounded-r-full bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />

      ) : null}

      <Icon
        size={18}
        className={cn(
          "shrink-0 transition-transform duration-200 group-hover:scale-110",
          active ? "text-[#2563EB]" : "text-slate-400 group-hover:text-slate-600",
        )}
      />
      {collapsed ? (
        <span className="sr-only">
          {item.name}
          {alert ? ` (${alert.count} need attention)` : ""}
        </span>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">{item.name}</span>
          {alert ? <NavAlertBadge alert={alert} /> : null}
          {!alert && item.badge ? (
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                item.badge === "Coming soon"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-[#2563EB]/10 text-[#2563EB]",
              )}
            >
              {item.badge}
            </span>
          ) : null}
        </>
      )}
      {collapsed && alert ? (
        <span className="absolute right-1 top-1">
          <NavAlertBadge alert={alert} />
        </span>
      ) : null}

    </Link>

  );

}



export function AdminSidebar({

  profile,

  collapsed = false,

  mobileOpen = false,

  onNavigate,

}: {

  profile: UserProfile;

  collapsed?: boolean;

  mobileOpen?: boolean;

  onNavigate?: () => void;

}) {

  const pathname = usePathname();

  const queryClient = useQueryClient();



  const { data: navBadgesData } = useQuery({

    queryKey: adminQueryKeys.navBadges(),

    queryFn: () => adminGet<{ badges: Record<string, AdminNavBadge> }>("nav-badges"),

    staleTime: 30_000,

    refetchInterval: 60_000,

  });



  const navAlerts = navBadgesData?.badges ?? {};



  const initial = profile.name?.[0]?.toUpperCase() ?? "A";

  const dashboardActive = isNavActive(pathname, DASHBOARD_ITEM.href);



  return (

    <aside

      className={cn(

        "flex h-full shrink-0 flex-col border-r border-slate-200/60 bg-white/80 shadow-[4px_0_24px_-8px_rgba(15,23,42,0.12)] backdrop-blur-xl md:shadow-none",

        "fixed left-0 top-0 z-40 w-[260px] will-change-transform md:relative md:z-0 md:will-change-auto",

        "transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:ease-out",

        "md:transition-[width] md:duration-200 md:ease-out",

        mobileOpen ? "translate-x-0" : "-translate-x-full",

        "md:translate-x-0",

        collapsed ? "md:w-[76px]" : "md:w-[260px]",

      )}

    >

      <div

        className={cn(

          "flex items-center py-5 transition-[padding] duration-200",

          collapsed ? "justify-center px-2" : "gap-2.5 px-5",

        )}

      >

        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1e3a8a] shadow-lg shadow-[#2563EB]/20">

          <span className="text-lg font-black text-white">B</span>

        </div>

        {!collapsed ? (

          <div className="flex min-w-0 flex-1 flex-col">

            <span className="text-[15px] font-black tracking-tight text-slate-900">

              Buy<span className="text-[#2563EB]">Hub</span>

            </span>

            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">

              Management

            </span>

          </div>

        ) : null}

      </div>



      <nav

        className={cn(

          "flex-1 space-y-1 overflow-y-auto pb-3 transition-[padding] duration-200",

          collapsed ? "px-2" : "px-3",

        )}

      >

        <NavLink

          item={DASHBOARD_ITEM}

          active={dashboardActive}

          collapsed={collapsed}

          alert={navAlerts[DASHBOARD_ITEM.href]}

          onNavigate={onNavigate}

          onPrefetch={() => void prefetchAdminRoute(queryClient, DASHBOARD_ITEM.href)}

        />



        {NAV_SECTIONS.map((section) => {

          const visibleItems = section.items.filter(

            (item) => !isAdminRouteHidden(item.href),

          );

          if (visibleItems.length === 0) return null;



          return (

            <div key={section.label} className={cn(collapsed ? "pt-2" : "pt-3")}>

              {collapsed ? (

                <div className="mb-2 h-px bg-slate-100" aria-hidden />

              ) : (

                <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400/90">

                  {section.label}

                </div>

              )}

              <div className="space-y-0.5">

                {visibleItems.map((item) => (

                  <NavLink

                    key={item.href}

                    item={item}

                    active={isNavActive(pathname, item.href)}

                    collapsed={collapsed}

                    alert={navAlerts[item.href]}

                    onNavigate={onNavigate}

                    onPrefetch={() => void prefetchAdminRoute(queryClient, item.href)}

                  />

                ))}

              </div>

            </div>

          );

        })}

      </nav>



      <div

        className={cn(

          "border-t border-slate-200/60 transition-[padding] duration-200",

          collapsed ? "p-2.5" : "p-4",

        )}

      >

        <div

          className={cn(

            "group flex items-center rounded-2xl border border-slate-100 bg-slate-50/50 transition-colors hover:bg-slate-50",

            collapsed ? "flex-col gap-2 p-2" : "gap-3 p-3",

          )}

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


