"use client";

import { formatCurrencyAmount } from "@/lib/format-currency";

export function formatProcurementInr(n: number) {
  return formatCurrencyAmount(n);
}
