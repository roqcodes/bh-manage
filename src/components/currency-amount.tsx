"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  formatCurrencyAmount,
  formatCurrencyCompactAmount,
  getCurrencySymbol,
  type CurrencySettings,
} from "@/lib/format-currency";

const SYMBOL_CLASS =
  "text-[0.72em] font-medium leading-none align-baseline opacity-80";

export function CurrencyAmount({
  amount,
  options,
  compact,
  settings,
  className,
  symbolClassName = SYMBOL_CLASS,
  showSymbol = true,
  fallback = "—",
}: {
  amount: number | null | undefined;
  options?: Intl.NumberFormatOptions;
  compact?: boolean;
  settings?: CurrencySettings;
  className?: string;
  symbolClassName?: string;
  /** When false, only the numeric amount is shown (for tables with symbol in header). */
  showSymbol?: boolean;
  fallback?: ReactNode;
}) {
  if (amount == null || !Number.isFinite(amount)) {
    return <span className={className}>{fallback}</span>;
  }

  const formatted = compact
    ? formatCurrencyCompactAmount(amount, settings)
    : formatCurrencyAmount(amount, options, settings);

  if (!showSymbol) {
    return <span className={cn("tabular-nums", className)}>{formatted}</span>;
  }

  const symbol = settings?.currency_symbol ?? getCurrencySymbol();
  return (
    <span className={cn("tabular-nums", className)}>
      <span className={symbolClassName}>{symbol}</span>
      {formatted}
    </span>
  );
}
