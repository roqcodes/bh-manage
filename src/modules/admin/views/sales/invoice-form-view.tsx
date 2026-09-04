"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type { SalesLineFormRow } from "@/common/erp/sales-types";
import { calcSalesLine, roundSalesMoney } from "@/common/erp/sales-types";
import { toDateInputValue } from "@/lib/format-date";
import { adminGet, adminPatch, adminPost } from "@/modules/admin/lib/admin-api-client";
import {
  AdminFormField,
  AdminFormGrid,
  AdminFormModalLayout,
  AdminFormSection,
  AdminFormShell,
  CustomerSearchSelect,
  ErpDocumentNumberField,
  type ErpFormViewBaseProps,
} from "@/modules/admin/ui";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import {
  SalesLinesEditor,
  emptySalesLine,
  salesLinesToApiInput,
} from "@/modules/erp/components/sales-lines-editor";
import {
  ActiveStoreFormField,
  useActiveStoreFormField,
} from "@/modules/erp/components/use-active-store-form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InvoiceFormViewProps = ErpFormViewBaseProps & {
  mode: "create" | "edit";
  invoiceId?: string;
};

export function InvoiceFormView({
  mode,
  invoiceId,
  variant = "page",
  open = true,
  onOpenChange,
  onSuccess,
}: InvoiceFormViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const { stores, activeStoreId, storeId, setStoreId, effectiveStoreId, storeRequiredMessage } =
    useActiveStoreFormField({ mode });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(mode === "edit");
  const isModal = variant === "modal";

  const [customerId, setCustomerId] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<SalesLineFormRow[]>([emptySalesLine()]);

  useEffect(() => {
    const preselected = searchParams.get("customerId");
    if (preselected && mode === "create") setCustomerId(preselected);
  }, [searchParams, mode]);

  useEffect(() => {
    if (mode !== "edit" || !invoiceId) return;
    adminGet<{
      user_id: string;
      store_id: string | null;
      created_at: string;
      due_date: string | null;
      discount: number;
      tax_inclusive: boolean;
      notes: string | null;
      users: { name: string | null; email: string | null } | null;
      invoice_items: Array<{
        variant_id: string | null;
        product_name: string;
        description: string | null;
        quantity: number;
        unit_price: number;
        gst_rate: number;
        unit_id: string | null;
      }>;
    }>(`erp/invoices/${invoiceId}`)
      .then((detail) => {
        setCustomerId(detail.user_id);
        setCustomerLabel(detail.users?.name ?? detail.users?.email ?? "");
        if (detail.store_id) setStoreId(detail.store_id);
        setInvoiceDate(detail.created_at?.slice(0, 10) ?? invoiceDate);
        setDueDate(toDateInputValue(detail.due_date));
        setDiscount(Number(detail.discount ?? 0));
        setTaxInclusive(detail.tax_inclusive);
        setNotes(detail.notes ?? "");
        setLines(
          detail.invoice_items.map((item) => ({
            key: `line-${item.product_name}-${Math.random().toString(36).slice(2, 7)}`,
            variantId: item.variant_id,
            productName: item.product_name,
            description: item.description ?? "",
            barcode: "",
            quantity: item.quantity,
            unitPrice: item.unit_price,
            taxRatePercent: item.gst_rate,
            unitId: item.unit_id,
          })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load invoice"))
      .finally(() => setLoadingInvoice(false));
  }, [invoiceId, invoiceDate, mode]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of lines) {
      const { taxable, taxAmount } = calcSalesLine(
        line.quantity,
        line.unitPrice,
        line.taxRatePercent,
        taxInclusive,
      );
      subtotal += taxable;
      tax += taxAmount;
    }
    const gross = roundSalesMoney(subtotal + tax);
    const net = roundSalesMoney(Math.max(0, gross - discount));
    return { subtotal: roundSalesMoney(subtotal), tax: roundSalesMoney(tax), total: net };
  }, [lines, taxInclusive, discount]);

  function handleCancel() {
    if (isModal) {
      onOpenChange?.(false);
    } else {
      router.push(invoiceId ? `/admin/erp/invoices/${invoiceId}` : "/admin/erp/invoices");
    }
  }

  function handleSuccessNavigate(id?: string) {
    if (isModal) {
      onOpenChange?.(false);
      onSuccess?.(id);
      return;
    }
    router.push(id ? `/admin/erp/invoices/${id}` : "/admin/erp/invoices");
  }

  function handleSubmit(finalize: boolean) {
    setError(null);
    if (!customerId) {
      setError("Customer is required");
      return;
    }
    if (!effectiveStoreId) {
      setError(storeRequiredMessage ?? "Store is required");
      return;
    }
    const apiLines = salesLinesToApiInput(lines);
    if (apiLines.length === 0) {
      setError("Add at least one item");
      return;
    }
    if (finalize && totals.total <= 0) {
      setError("Enter line rates so the total is greater than zero before issuing.");
      return;
    }

    startTransition(async () => {
      try {
        if (invoiceId) {
          await adminPatch(`erp/invoices/${invoiceId}`, {
            invoiceDate,
            dueDate: dueDate || invoiceDate,
            lines: apiLines,
            discount,
            taxInclusive,
            notes: notes || undefined,
          });
          handleSuccessNavigate(invoiceId);
          return;
        }

        const res = await adminPost<{ id: string }>("erp/invoices", {
          userId: customerId,
          storeId: effectiveStoreId,
          invoiceDate,
          dueDate: dueDate || invoiceDate,
          lines: apiLines,
          discount,
          taxInclusive,
          notes: notes || undefined,
          finalize,
        });
        handleSuccessNavigate(res.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create invoice");
      }
    });
  }

  if (isModal && !open) return null;

  const title = mode === "edit" ? "Edit invoice" : "Create invoice";
  const backHref = invoiceId ? `/admin/erp/invoices/${invoiceId}` : "/admin/erp/invoices";

  const totalsSidebar = (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Total</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sub total</span>
          <span className="tabular-nums font-medium">{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="tabular-nums font-medium">{totals.tax.toFixed(2)}</span>
        </div>
        <div className="space-y-1">
          <Label>Discount</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={discount || ""}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="flex justify-between border-t pt-3 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{totals.total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );

  const footer = isModal ? (
    <>
      <Button type="button" variant="outline" onClick={handleCancel}>
        Cancel
      </Button>
      {mode === "create" ? (
        <Button variant="outline" disabled={pending} onClick={() => handleSubmit(false)}>
          Save as draft
        </Button>
      ) : null}
      <Button disabled={pending} onClick={() => handleSubmit(true)}>
        {pending ? "Savingâ€¦" : mode === "edit" ? "Update invoice" : "Save invoice"}
      </Button>
    </>
  ) : undefined;

  return (
    <AdminFormShell
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Create or update a sales invoice with line items, tax, and payment terms."
      backHref={backHref}
      breadcrumb={[
        { label: "Invoices", href: "/admin/erp/invoices" },
        { label: title },
      ]}
      size="landscape"
      formId={formId}
      pending={pending}
      footer={footer}
      loading={loadingInvoice}
      loadingFallback={<AdminPageSkeleton />}
    >
      <form id={formId} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <AdminFormModalLayout sidebar={totalsSidebar}>
          <AdminFormSection title="Invoice details">
            <AdminFormGrid cols={3}>
              <AdminFormField label="Customer" required className="sm:col-span-2">
                <CustomerSearchSelect
                  value={customerId || null}
                  selectedLabel={customerLabel || undefined}
                  disabled={mode === "edit"}
                  onChange={(id, option) => {
                    setCustomerId(id ?? "");
                    setCustomerLabel(option?.label ?? "");
                  }}
                />
                <Link href="/admin/customers" className="mt-1 inline-block text-xs text-primary hover:underline">
                  Add customer
                </Link>
              </AdminFormField>
              <ErpDocumentNumberField kind="INV" enabled={mode === "create"} />
              <AdminFormField label="Store">
                <ActiveStoreFormField
                  mode={mode}
                  stores={stores}
                  activeStoreId={activeStoreId}
                  storeId={storeId}
                  onStoreIdChange={setStoreId}
                  label=""
                />
              </AdminFormField>
              <AdminFormField label="Invoice date">
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Due date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Notes" className="sm:col-span-2">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </AdminFormField>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  onChange={(e) => setTaxInclusive(e.target.checked)}
                />
                Item rates are tax inclusive
              </label>
            </AdminFormGrid>
          </AdminFormSection>

          <AdminFormSection title="Invoice items">
            <SalesLinesEditor
              lines={lines}
              onChange={setLines}
              storeId={effectiveStoreId}
              taxInclusive={taxInclusive}
              showSerial
            />
          </AdminFormSection>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!isModal ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
              {mode === "create" ? (
                <Button variant="outline" disabled={pending} onClick={() => handleSubmit(false)}>
                  Save as draft
                </Button>
              ) : null}
              <Button disabled={pending} onClick={() => handleSubmit(true)}>
                {pending ? "Savingâ€¦" : mode === "edit" ? "Update invoice" : "Save invoice"}
              </Button>
            </div>
          ) : null}
        </AdminFormModalLayout>
      </form>
    </AdminFormShell>
  );
}
