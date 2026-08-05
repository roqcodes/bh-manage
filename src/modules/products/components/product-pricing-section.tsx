"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Info, Package, Sparkles, Warehouse } from "lucide-react";

import { computeFinalPrice } from "@/modules/pricing/pricing.compute";
import type { PricingRuleRow } from "@/modules/pricing/types";
import type { VariantPricingSuggestion } from "@/modules/pricing/services/pricing.service";
import {
  applySuggestedPricesAction,
  fetchVariantPricingSuggestionsAction,
  setProductSmartPricingAction,
  upsertProductPricingRuleAction,
} from "@/modules/pricing/actions/product-pricing.actions";
import {
  FieldLabel,
  FormError,
  PrimaryBtn,
  SecondaryBtn,
  inputCls,
} from "@/modules/admin/components/modal";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

function parseOptionalNonNeg(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BetaBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-violet-200/80 bg-gradient-to-r from-violet-50 to-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-700 ring-1 ring-violet-500/10">
      Beta
    </span>
  );
}

function ModePill({
  mode,
  label,
  active = false,
}: {
  mode: "A" | "B";
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        active
          ? "border border-[#2563EB]/20 bg-[#2563EB]/10 text-[#2563EB]"
          : "border border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      <span className="font-mono text-[10px] opacity-80">{mode}</span>
      {label}
    </span>
  );
}

export function ProductPricingSection({
  productId,
  initialRule,
  useSmartPricing,
}: {
  productId: string;
  initialRule: PricingRuleRow | null;
  useSmartPricing: boolean;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [smartEnabled, setSmartEnabled] = useState(useSmartPricing);

  const [marginStr, setMarginStr] = useState(
    initialRule?.margin_percent != null ? String(initialRule.margin_percent) : "",
  );
  const [fixedStr, setFixedStr] = useState(
    initialRule?.fixed_markup != null ? String(initialRule.fixed_markup) : "",
  );
  const [isActive, setIsActive] = useState(() =>
    Boolean(
      initialRule?.is_active &&
        (initialRule.margin_percent != null || initialRule.fixed_markup != null),
    ),
  );
  const [previewBaseStr, setPreviewBaseStr] = useState("100");

  useEffect(() => {
    setSmartEnabled(useSmartPricing);
  }, [useSmartPricing]);

  useEffect(() => {
    if (!initialRule) {
      setMarginStr("");
      setFixedStr("");
      setIsActive(false);
      return;
    }
    setMarginStr(
      initialRule.margin_percent != null ? String(initialRule.margin_percent) : "",
    );
    setFixedStr(
      initialRule.fixed_markup != null ? String(initialRule.fixed_markup) : "",
    );
    setIsActive(
      initialRule.is_active === true &&
        (initialRule.margin_percent != null || initialRule.fixed_markup != null),
    );
  }, [
    initialRule?.id,
    initialRule?.margin_percent,
    initialRule?.fixed_markup,
    initialRule?.is_active,
  ]);

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: adminQueryKeys.productPricingSuggestions(productId),
    queryFn: () => fetchVariantPricingSuggestionsAction(productId),
    enabled: smartEnabled,
  });

  const marginNum = parseOptionalNonNeg(marginStr);
  const fixedNum = parseOptionalNonNeg(fixedStr);
  const bothFilled =
    marginStr.trim() !== "" &&
    fixedStr.trim() !== "" &&
    marginNum !== null &&
    fixedNum !== null;

  const preview = useMemo(() => {
    const base = parseFloat(previewBaseStr);
    const b = Number.isFinite(base) && base >= 0 ? base : 0;
    let m = marginNum;
    let f = fixedNum;
    if (m !== null && f !== null) f = null;
    const rule =
      m === null && f === null ? null : { margin_percent: m, fixed_markup: f };
    return computeFinalPrice(b, rule);
  }, [previewBaseStr, marginNum, fixedNum]);

  function handleToggleSmart(checked: boolean) {
    setError(null);
    setSmartEnabled(checked);
    startTransition(async () => {
      const res = await setProductSmartPricingAction(productId, checked);
      if (!res.ok) {
        setError(res.message);
        setSmartEnabled(!checked);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(productId),
      });
    });
  }

  function handleSaveRule() {
    setError(null);
    const m = parseOptionalNonNeg(marginStr);
    const f = parseOptionalNonNeg(fixedStr);

    if (marginStr.trim() !== "" && marginStr.trim() !== "." && m === null) {
      setError("Margin % must be a valid number ≥ 0.");
      return;
    }
    if (fixedStr.trim() !== "" && fixedStr.trim() !== "." && f === null) {
      setError("Fixed markup must be a valid number ≥ 0.");
      return;
    }

    const marginPercent = marginStr.trim() === "" ? null : m;
    const fixedMarkup = fixedStr.trim() === "" ? null : f;

    startTransition(async () => {
      const res = await upsertProductPricingRuleAction({
        productId,
        marginPercent,
        fixedMarkup,
        isActive: marginPercent === null && fixedMarkup === null ? false : isActive,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(productId),
      });
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productPricingSuggestions(productId),
      });
    });
  }

  function handleApplySuggestions() {
    setError(null);
    startTransition(async () => {
      const res = await applySuggestedPricesAction(productId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(productId),
      });
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productPricingSuggestions(productId),
      });
    });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      {/* How it works */}
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50/90 via-white to-[#2563EB]/[0.03] px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2563EB]/15 bg-[#2563EB]/10 text-[#2563EB]">
            <Info className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Pricing model
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">How pricing works</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex gap-2.5 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 shadow-sm">
                <Warehouse className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
                <p className="text-[12px] leading-snug text-slate-600">
                  <strong className="text-slate-800">Customers pay list price.</strong> Sales need
                  central warehouse stock only.
                </p>
              </div>
              <div className="flex gap-2.5 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 shadow-sm">
                <Package className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
                <p className="text-[12px] leading-snug text-slate-600">
                  <strong className="text-slate-800">Vendor stock = procurement.</strong> Refill via{" "}
                  <Link href="/admin/procurement" className="font-bold text-[#2563EB] hover:underline">
                    Procurement
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Smart pricing header + toggle */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            smartEnabled
              ? "border-[#2563EB]/25 bg-gradient-to-br from-[#2563EB]/[0.06] to-violet-50/50"
              : "border-slate-200/80 bg-slate-50/40"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles
                  className={`size-4 ${smartEnabled ? "text-[#2563EB]" : "text-slate-400"}`}
                  aria-hidden
                />
                <h3 className="text-base font-black tracking-tight text-slate-950 sm:text-lg">
                  Smart pricing assist
                </h3>
                <BetaBadge />
              </div>
              <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-slate-500">
                Admin-only cost + margin suggestions. Never changes what customers are charged until
                you apply list prices yourself.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ModePill
                  mode="A"
                  label={smartEnabled ? "List price (sales)" : "List price — active"}
                  active={!smartEnabled}
                />
                {smartEnabled ? (
                  <ModePill mode="B" label="Assist enabled" active />
                ) : null}
              </div>
            </div>

            <label
              className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition ${
                smartEnabled
                  ? "border-[#2563EB]/30 bg-white ring-2 ring-[#2563EB]/15"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${isPending ? "pointer-events-none opacity-60" : ""}`}
            >
              <span className="text-right">
                <span className="block text-[13px] font-bold text-slate-900">Enable assist</span>
                <span className="block text-[11px] font-medium text-slate-500">
                  {smartEnabled ? "On" : "Off"}
                </span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 rounded accent-[#2563EB]"
                checked={smartEnabled}
                onChange={(e) => handleToggleSmart(e.target.checked)}
                disabled={isPending}
                aria-label="Enable smart pricing assist"
              />
            </label>
          </div>
        </div>

        {!smartEnabled ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
            <strong className="text-slate-800">Mode A</strong> — set selling prices on each variant
            below. Customers pay that list price when central stock is available.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            <p className="rounded-lg border border-[#2563EB]/15 bg-[#2563EB]/5 px-4 py-2.5 text-[13px] text-slate-700">
              <strong className="text-[#2563EB]">Mode B</strong> — set margin rules, review per-SKU
              suggestions, then apply to list prices when ready.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel label="Margin % (optional)">
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  step="0.01"
                  value={marginStr}
                  onChange={(e) => setMarginStr(e.target.value)}
                  placeholder="e.g. 10"
                />
              </FieldLabel>
              <FieldLabel label="Fixed markup ₹ (optional)">
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  step="0.01"
                  value={fixedStr}
                  onChange={(e) => setFixedStr(e.target.value)}
                  placeholder="e.g. 5"
                />
              </FieldLabel>
            </div>

            {bothFilled && (
              <p className="text-[12px] font-semibold text-amber-800">
                Both fields set — margin % is saved; fixed markup is ignored.
              </p>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#2563EB]"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={marginStr.trim() === "" && fixedStr.trim() === ""}
              />
              Rule active
            </label>

            <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Sample calculation
              </p>
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <FieldLabel label="Sample vendor cost (₹)">
                  <input
                    className={`${inputCls} max-w-[140px]`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={previewBaseStr}
                    onChange={(e) => setPreviewBaseStr(e.target.value)}
                  />
                </FieldLabel>
              </div>
              <p className="text-sm text-slate-800">
                Cost {formatInr(preview.base_price)}{" "}
                <span className="text-slate-400">→</span> suggested{" "}
                <strong className="text-[#2563EB]">{formatInr(preview.final_price)}</strong>
                <span className="ms-2 text-slate-500">
                  (margin {formatInr(preview.margin_amount)})
                </span>
              </p>
            </div>

            <div className="flex justify-end">
              <PrimaryBtn type="button" disabled={isPending} onClick={handleSaveRule}>
                {isPending ? "Saving…" : "Save pricing rule"}
              </PrimaryBtn>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#2563EB]" aria-hidden />
                  <h4 className="text-sm font-bold text-slate-900">SKU suggestions</h4>
                  <BetaBadge />
                </div>
                <SecondaryBtn
                  disabled={isPending || suggestionsLoading}
                  onClick={handleApplySuggestions}
                >
                  Apply all to list prices
                </SecondaryBtn>
              </div>

              {suggestionsLoading ? (
                <p className="text-sm text-slate-500">Loading suggestions…</p>
              ) : suggestions.length === 0 ? (
                <p className="text-sm text-slate-500">Add variants first.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="min-w-full text-left text-[12px]">
                    <thead className="bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">SKU</th>
                        <th className="px-3 py-2.5">Central stock</th>
                        <th className="px-3 py-2.5">Vendor cost</th>
                        <th className="px-3 py-2.5">Current list</th>
                        <th className="px-3 py-2.5">Suggested</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(suggestions as VariantPricingSuggestion[]).map((row) => (
                        <tr key={row.variantId} className="transition hover:bg-slate-50/80">
                          <td className="px-3 py-2.5 font-semibold text-slate-800">
                            {row.variantName}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-600">
                            <span
                              className={
                                row.centralStock > 0
                                  ? "font-semibold text-emerald-700"
                                  : "text-slate-400"
                              }
                            >
                              {row.centralStock}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-600">
                            {row.lowestVendorBase != null
                              ? formatInr(row.lowestVendorBase)
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-600">
                            {row.listPrice > 0 ? formatInr(row.listPrice) : "—"}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums font-bold text-[#2563EB]">
                            {row.suggestedPrice != null ? formatInr(row.suggestedPrice) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <FormError message={error} />
      </div>
    </section>
  );
}
