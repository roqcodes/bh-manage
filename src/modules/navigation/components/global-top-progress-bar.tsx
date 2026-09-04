"use client";

import { useSyncExternalStore } from "react";

import {
  isGlobalProgressActive,
  subscribeGlobalProgress,
} from "@/modules/navigation/lib/async-progress";

function subscribe(callback: () => void) {
  return subscribeGlobalProgress(callback);
}

function getSnapshot() {
  return isGlobalProgressActive();
}

function getServerSnapshot() {
  return false;
}

export function GlobalTopProgressBar() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden bg-slate-200/70"
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
    >
      <div className="kg-global-nav-progress h-full w-1/3 rounded-r-full bg-[#2563EB] shadow-sm" />
    </div>
  );
}
