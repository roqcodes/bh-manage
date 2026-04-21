"use client";

import { useState, useTransition } from "react";
import { Calculator, Cpu, Sparkles } from "lucide-react";

import type { AllocationLine, ProcurementPlan } from "@/modules/procurement/types";
import {
  runProcurementEngineAction,
  synchronizeProcurementPlanAction,
} from "@/modules/procurement/actions/procurement.actions";
import { approveProcurementPlanAction } from "@/modules/purchase-orders/actions/purchase-orders.actions";
import { previewPricingAction } from "@/modules/pricing/actions/pricing.actions";
import {
  PrimaryBtn,
  FieldLabel,
  inputCls,
} from "@/modules/admin/components/modal";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_18px_40px_-24px_rgba(15,23,42,0.14)]";

const INNER =
  "rounded-xl border border-slate-100/90 bg-slate-50/50 px-4 py-3 text-sm text-slate-800";

export function ProcurementWorkspace() {
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState<ProcurementPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approveMsg, setApproveMsg] = useState<string | null>(null);

  const [pProduct, setPProduct] = useState("");
  const [pVariant, setPVariant] = useState("");
  const [pVendor, setPVendor] = useState("");
  const [pBase, setPBase] = useState("");
  const [preview, setPreview] = useState<{
    base_price: number;
    margin_amount: number;
    final_price: number;
  } | null>(null);

  const lines = plan?.allocations ?? [];

  function runEngine() {
    setError(null);
    setApproveMsg(null);
    startTransition(async () => {
      try {
        const p = await runProcurementEngineAction();
        setPlan(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run engine.");
      }
    });
  }

  function syncFromAllocations(next: AllocationLine[]) {
    startTransition(async () => {
      try {
        const p = await synchronizeProcurementPlanAction(next);
        setPlan(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to sync plan.");
      }
    });
  }

  function updateQty(index: number, qty: number) {
    if (!plan) return;
    const next = [...plan.allocations];
    if (!next[index]) return;
    next[index] = { ...next[index], allocated_qty: qty };
    syncFromAllocations(next);
  }

  function removeLine(index: number) {
    if (!plan) return;
    const next = plan.allocations.filter((_, i) => i !== index);
    syncFromAllocations(next);
  }

  function removeVendor(vendorId: string) {
    if (!plan) return;
    const next = plan.allocations.filter((l) => l.vendor_id !== vendorId);
    syncFromAllocations(next);
  }

  function runPreview() {
    setError(null);
    setPreview(null);
    const base = parseFloat(pBase);
    if (!pProduct || !pVariant || !pVendor || !Number.isFinite(base)) {
      setError("Pricing preview: fill product, variant, vendor, and base price.");
      return;
    }
    startTransition(async () => {
      try {
        const b = await previewPricingAction({
          productId: pProduct.trim(),
          variantId: pVariant.trim(),
          vendorId: pVendor.trim(),
          basePrice: base,
        });
        setPreview(b);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview failed.");
      }
    });
  }

  function approve() {
    setError(null);
    setApproveMsg(null);
    if (!plan) return;
    const normalized = plan.allocations.filter((l) => l.allocated_qty > 0);
    if (normalized.length === 0) {
      setError("Nothing to approve.");
      return;
    }
    startTransition(async () => {
      try {
        const { poIds } = await approveProcurementPlanAction(normalized);
        setApproveMsg(`Created ${poIds.length} purchase order(s).`);
        setPlan(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Approval failed.");
      }
    });
  }

  const vendorsInPlan = [...new Set(lines.map((l) => l.vendor_id))];

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className={`${CARD} p-5 sm:p-6`} aria-label="Pricing preview">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm ring-1 ring-white/80">
            <Calculator className="size-3" aria-hidden />
          </span>
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Pricing preview
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              Read-only: base, margin, and final price. No database writes.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Product ID">
            <input
              className={inputCls}
              value={pProduct}
              onChange={(e) => setPProduct(e.target.value)}
              placeholder="UUID"
            />
          </FieldLabel>
          <FieldLabel label="Variant ID">
            <input
              className={inputCls}
              value={pVariant}
              onChange={(e) => setPVariant(e.target.value)}
              placeholder="UUID"
            />
          </FieldLabel>
          <FieldLabel label="Vendor ID">
            <input
              className={inputCls}
              value={pVendor}
              onChange={(e) => setPVendor(e.target.value)}
              placeholder="UUID"
            />
          </FieldLabel>
          <FieldLabel label="Base price (₹)">
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={pBase}
              onChange={(e) => setPBase(e.target.value)}
            />
          </FieldLabel>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryBtn type="button" disabled={isPending} onClick={runPreview}>
            {isPending ? "…" : "Preview"}
          </PrimaryBtn>
        </div>
        {preview ? (
          <div className={`mt-4 ${INNER}`}>
            <p>
              <span className="font-semibold text-slate-600">Base:</span>{" "}
              ₹{preview.base_price.toFixed(2)}
            </p>
            <p>
              <span className="font-semibold text-slate-600">Margin:</span>{" "}
              ₹{preview.margin_amount.toFixed(2)}
            </p>
            <p>
              <span className="font-semibold text-slate-600">Final:</span>{" "}
              ₹{preview.final_price.toFixed(2)}
            </p>
          </div>
        ) : null}
      </section>

      <section className={`${CARD} p-5 sm:p-6`} aria-label="Procurement plan">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-500 shadow-sm ring-1 ring-white/80">
              <Cpu className="size-3" aria-hidden />
            </span>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Procurement plan
              </h2>
              <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
                Demand from pending + processing orders vs inventory; lowest
                vendor price first.
              </p>
            </div>
          </div>
          <PrimaryBtn type="button" disabled={isPending} onClick={runEngine}>
            {isPending ? "Running…" : "Run engine"}
          </PrimaryBtn>
        </div>

        {vendorsInPlan.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Remove vendor
            </span>
            <div className="flex flex-wrap gap-2">
              {vendorsInPlan.map((vid) => {
                const label =
                  plan?.by_vendor.find((g) => g.vendor_id === vid)?.vendor_name?.trim() ||
                  `${vid.slice(0, 8)}…`;
                return (
                  <button
                    key={vid}
                    type="button"
                    className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    onClick={() => removeVendor(vid)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 text-sm font-medium text-rose-800">
            {error}
          </p>
        ) : null}
        {approveMsg ? (
          <p className="mb-4 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-sm font-medium text-emerald-900">
            {approveMsg}
          </p>
        ) : null}

        {plan && plan.by_vendor.length > 0 ? (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-amber-500/80" aria-hidden />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                By vendor
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {plan.by_vendor.map((g) => (
                <div key={g.vendor_id} className={INNER}>
                  <p className="text-sm font-semibold text-slate-900">
                    {g.vendor_name?.trim() || "—"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] font-medium text-slate-400">
                    {g.vendor_id}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    <span className="font-semibold text-slate-500">Total qty:</span>{" "}
                    {g.total_allocated_quantity}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    <span className="font-semibold text-slate-500">Total cost:</span>{" "}
                    ₹{g.total_cost.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {lines.length === 0 ? (
          <p className="text-sm font-medium text-slate-400">
            No allocations yet. Run the engine when orders create shortage.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200/60">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/90 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="min-w-[200px] px-4 py-3">Product · variant</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Base ₹</th>
                    <th className="px-4 py-3">Line ₹</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-800">
                  {lines.map((line, index) => (
                    <tr
                      key={`${line.vendor_product_id}-${index}`}
                      title={`Vendor ${line.vendor_id} · Variant ${line.variant_id}`}
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm font-semibold text-slate-900">
                          {line.vendor_name?.trim() || "—"}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] font-medium text-slate-400">
                          {line.vendor_id}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm font-semibold text-slate-900">
                          {line.product_name?.trim() || "—"}
                        </p>
                        <p className="text-xs font-medium text-slate-600">
                          {line.variant_name?.trim() || "—"}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] font-medium text-slate-400">
                          {line.variant_id}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          className="h-9 w-20 rounded-lg border border-slate-200/80 bg-white px-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                          value={line.allocated_qty}
                          onChange={(e) =>
                            updateQty(index, parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-700">
                        {line.base_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                        {line.total_cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-600 transition hover:underline"
                          onClick={() => removeLine(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-base font-bold tabular-nums text-slate-900">
                System total: ₹{(plan?.system_total_cost ?? 0).toFixed(2)}
              </p>
              <PrimaryBtn type="button" disabled={isPending} onClick={approve}>
                Approve & create purchase orders
              </PrimaryBtn>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
