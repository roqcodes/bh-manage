"use client";

import { useState } from "react";
import { format } from "date-fns";
import { PanelLeft, PanelLeftClose, Search } from "lucide-react";

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
  const [query, setQuery] = useState("");
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
      <div className="grid grid-cols-1 gap-2 px-4 py-2 sm:px-6 md:h-[56px] md:grid-cols-[minmax(0,1fr)_min(100%,28rem)_minmax(0,1fr)] md:items-center md:gap-4 md:py-0">
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
          <div className="md:hidden">{timeEl}</div>
        </div>

        <div className="mx-auto w-full max-w-md justify-self-center px-0 md:px-1">
          <label className="relative block w-full">
            <span className="sr-only">Search</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full rounded-xl border border-slate-200/80 bg-white/90 pl-10 pr-3 text-sm font-medium text-slate-900 shadow-sm shadow-slate-900/5 outline-none ring-slate-900/5 placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-[#2563EB]/15"
            />
          </label>
        </div>

        <div className="hidden min-w-0 items-center justify-end md:flex">
          {timeEl}
        </div>
      </div>
    </header>
  );
}
