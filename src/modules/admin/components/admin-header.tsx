"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { PanelLeft, PanelLeftClose, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { AdminSearchTrigger } from "@/modules/admin/components/admin-global-search";

type AdminHeaderProps = {
  sidebarCollapsed: boolean;
  /** Mobile drawer open (ignored at `md+`). */
  mobileNavOpen: boolean;
  isMdViewport: boolean;
  onToggleSidebar: () => void;
};

export function AdminHeader({
  sidebarCollapsed,
  mobileNavOpen,
  isMdViewport,
  onToggleSidebar,
}: AdminHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);

  const now = new Date();

  const day = format(now, "d");
  const month = format(now, "MMM").toUpperCase();
  const year = format(now, "yyyy");

  const navExpanded = isMdViewport ? !sidebarCollapsed : mobileNavOpen;
  const toggleLabel = isMdViewport
    ? sidebarCollapsed
      ? "Expand sidebar"
      : "Collapse sidebar"
    : mobileNavOpen
      ? "Close navigation menu"
      : "Open navigation menu";

  const refreshing = spinning || isPending;

  const onRefresh = useCallback(() => {
    if (refreshing) return;
    setSpinning(true);
    startTransition(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      router.refresh();
    });
    window.setTimeout(() => setSpinning(false), 650);
  }, [queryClient, refreshing, router]);

  const refreshBtn = (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 disabled:opacity-60"
      aria-label="Refresh data"
      title="Refresh"
    >
      <RefreshCw
        className={cn("size-[18px]", refreshing && "animate-spin")}
        aria-hidden
      />
    </button>
  );

  const timeEl = (
    <time
      dateTime={now.toISOString()}
      className="flex items-stretch gap-3 text-slate-800"
    >
      <span className="flex items-center justify-end tabular-nums">
        <span className="text-[28px] font-black leading-none tracking-tight text-slate-950">
          {day}
        </span>
      </span>
      <span
        className="w-px shrink-0 self-stretch bg-slate-200"
        aria-hidden
      />
      <span className="flex min-w-[2.5rem] flex-col justify-center gap-0.5 py-0.5 text-right leading-none">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {month}
        </span>
        <span className="text-[13px] font-semibold tabular-nums text-slate-700">
          {year}
        </span>
      </span>
    </time>
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/70 bg-[#F8FAFC]/85 backdrop-blur-md">
      <div className="grid grid-cols-1 gap-2 px-3 py-1.5 sm:px-4 md:h-[52px] md:grid-cols-[minmax(0,1fr)_min(100%,42rem)_minmax(0,1fr)] md:items-center md:gap-4 md:py-0">
        <div className="flex min-w-0 items-center justify-between md:justify-start">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900"
            aria-label={toggleLabel}
            aria-expanded={navExpanded}
          >
            {isMdViewport ? (
              sidebarCollapsed ? (
                <PanelLeft className="size-5" aria-hidden />
              ) : (
                <PanelLeftClose className="size-5" aria-hidden />
              )
            ) : mobileNavOpen ? (
              <PanelLeftClose className="size-5" aria-hidden />
            ) : (
              <PanelLeft className="size-5" aria-hidden />
            )}
          </button>
          <div className="flex items-center gap-1 md:hidden">
            {refreshBtn}
            {timeEl}
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl justify-self-center px-0 md:px-1">
          <label className="relative block w-full">
            <span className="sr-only">Quick search</span>
            <AdminSearchTrigger />
          </label>
        </div>

        <div className="hidden min-w-0 items-center justify-end gap-1 md:flex">
          {refreshBtn}
          {timeEl}
        </div>
      </div>
    </header>
  );
}
