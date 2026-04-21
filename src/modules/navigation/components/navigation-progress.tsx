"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(routeKey);

  useEffect(() => {
    if (prevKey.current !== routeKey) {
      setActive(false);
      prevKey.current = routeKey;
    }
  }, [routeKey]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!el) return;
      const a = el as HTMLAnchorElement;
      if (a.target && a.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.hasAttribute("download")) return;
      try {
        const next = new URL(a.href);
        if (next.origin !== window.location.origin) return;
        const here = `${window.location.pathname}${window.location.search}`;
        const dest = `${next.pathname}${next.search}`;
        if (dest === here) return;
        setActive(true);
      } catch {
        /* ignore invalid href */
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setActive(false), 12_000);
    return () => window.clearTimeout(t);
  }, [active, routeKey]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden bg-slate-200/70"
      aria-hidden
    >
      <div className="kg-global-nav-progress h-full w-1/3 rounded-r-full bg-[#2563EB] shadow-sm" />
    </div>
  );
}

/** Top indeterminate bar on internal navigations; pair with root/segment `loading.tsx`. */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
