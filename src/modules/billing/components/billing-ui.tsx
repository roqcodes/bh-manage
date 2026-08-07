"use client";

export function formatBillingInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}
