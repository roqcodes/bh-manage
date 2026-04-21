"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { computeFinalPrice } from "@/modules/pricing/pricing.compute";
import type { PricingRuleRow } from "@/modules/pricing/types";
import { upsertProductPricingRuleAction } from "@/modules/pricing/actions/product-pricing.actions";
import {
  FieldLabel,
  FormError,
  PrimaryBtn,
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

export function ProductPricingSection({
  productId,
  initialRule,
}: {
  productId: string;
  initialRule: PricingRuleRow | null;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [marginStr, setMarginStr] = useState(
    initialRule?.margin_percent != null
      ? String(initialRule.margin_percent)
      : "",
  );
  const [fixedStr, setFixedStr] = useState(
    initialRule?.fixed_markup != null
      ? String(initialRule.fixed_markup)
      : "",
  );
  const [isActive, setIsActive] = useState(() =>
    Boolean(
      initialRule?.is_active &&
        (initialRule.margin_percent != null || initialRule.fixed_markup != null),
    ),
  );
  const [previewBaseStr, setPreviewBaseStr] = useState("100");

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
    if (m !== null && f !== null) {
      f = null;
    }
    const rule =
      m === null && f === null
        ? null
        : { margin_percent: m, fixed_markup: f };
    return computeFinalPrice(b, rule, null);
  }, [previewBaseStr, marginNum, fixedNum]);

  function handleSave() {
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
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  const hasRule =
    initialRule &&
    (initialRule.margin_percent != null || initialRule.fixed_markup != null);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]">
      <h3 className="mb-1 text-lg font-black tracking-tight text-slate-950">
        Pricing
      </h3>
      <p className="mb-4 text-[13px] font-medium leading-relaxed text-slate-500">
        Applied at checkout on top of vendor base price. Preview matches catalog
        math; per-vendor overrides are not included here.
      </p>

      {!hasRule && (
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          No pricing rule yet. Add margin % or fixed markup (₹), or leave both empty
          to disable.
        </p>
      )}

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
        <p className="mt-2 text-[12px] font-semibold text-amber-800">
          Both fields are set — margin % is saved; fixed markup is ignored.
        </p>
      )}

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#2563EB]"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={marginStr.trim() === "" && fixedStr.trim() === ""}
        />
        Rule active (ignored when both margin and markup are empty)
      </label>

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          Preview (read-only)
        </p>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <FieldLabel label="Sample vendor base (₹)">
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
          <span className="font-bold text-slate-600">Base:</span> ₹
          {preview.base_price.toFixed(2)}
          {" → "}
          <span className="font-bold text-slate-600">Final:</span> ₹
          {preview.final_price.toFixed(2)}
          <span className="ms-2 text-slate-500">
            (margin ₹{preview.margin_amount.toFixed(2)})
          </span>
        </p>
      </div>

      <FormError message={error} />
      <div className="mt-4 flex justify-end">
        <PrimaryBtn type="button" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save pricing rule"}
        </PrimaryBtn>
      </div>
    </section>
  );
}
