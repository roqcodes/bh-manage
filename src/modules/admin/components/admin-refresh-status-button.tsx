"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";
import {
  getGlobalProgressMessages,
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

function getMessagesSnapshot() {
  return getGlobalProgressMessages();
}

function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-[3px]", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="kg-refresh-dot size-[5px] rounded-full bg-current"
          style={{ animationDelay: `${i * 0.14}s` }}
        />
      ))}
    </span>
  );
}

export function AdminRefreshStatusButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [hoverOpen, setHoverOpen] = useState(false);
  const adminFetching = useIsFetching({ queryKey: ["admin"] });

  const globalActive = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const messages = useSyncExternalStore(subscribe, getMessagesSnapshot, () => []);

  const busy = globalActive || isPending || adminFetching > 0;

  const onRefresh = useCallback(() => {
    if (busy) return;
    startTransition(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      router.refresh();
    });
  }, [busy, queryClient, router]);

  const activityMessages =
    messages.length > 0 ? messages : busy ? ["Syncing admin data with the database…"] : [];

  const showActivityCard = hoverOpen && busy && activityMessages.length > 0;
  const showIdleHint = hoverOpen && !busy;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
      onFocus={() => setHoverOpen(true)}
      onBlur={() => setHoverOpen(false)}
    >
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-90"
        aria-label={busy ? "Loading data" : "Refresh data"}
        aria-busy={busy}
      >
        <span className="relative flex size-[18px] items-center justify-center">
          <RefreshCw
            className={cn(
              "absolute size-[18px] transition-all duration-300 ease-out",
              busy ? "scale-50 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0",
            )}
            aria-hidden
          />
          <LoadingDots
            className={cn(
              "absolute transition-all duration-300 ease-out",
              busy ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
          />
        </span>
      </button>

      {(showActivityCard || showIdleHint) && (
        <div
          className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 w-[min(18rem,calc(100vw-1.5rem))] animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-200"
          role="status"
        >
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-lg ring-1 ring-slate-900/5">
            {showActivityCard ? (
              <>
                <p className="text-xs font-medium text-slate-900">Working in the background</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  We&apos;re fetching the latest data from your database.
                </p>
                <ul className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2.5">
                  {activityMessages.map((msg) => (
                    <li key={msg} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden />
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-900">Refresh</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  Reload this page and sync admin data with the database.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
