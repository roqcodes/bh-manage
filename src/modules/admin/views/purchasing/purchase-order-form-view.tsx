"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ErpPurchaseOrderDetail } from "@/common/erp/purchasing-types";
import { roundMoney } from "@/common/erp/purchasing-types";
import { adminGet, adminPost, adminPut } from "@/modules/admin/lib/admin-api-client";
import {
  AdminFormActions,
  AdminFormField,
  AdminFormGrid,
  AdminFormModalLayout,
  AdminFormSection,
  AdminFormShell,
  VendorSearchSelect,
  type ErpFormViewBaseProps,
} from "@/modules/admin/ui";
import { AdminPageSkeleton } from "@/modules/admin/components/admin-page-skeleton";
import type { PurchaseLineFormRow } from "@/common/erp/purchasing-types";
import {
  emptyPurchaseLine,
  linesToApiInput,
  PurchaseLinesEditor,
} from "@/modules/purchasing/components/purchase-lines-editor";
import { StoreSelect, useErpStores } from "@/modules/erp/components/use-erp-stores";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { calcPurchaseLine } from "@/common/erp/purchasing-types";

export type PurchaseOrderFormViewProps = ErpFormViewBaseProps & {
  mode: "create" | "edit";
  poId?: string;
};

export function PurchaseOrderFormView({
  mode,
  poId,
  variant = "page",
  open = true,
  onOpenChange,
  onSuccess,
}: PurchaseOrderFormViewProps) {
  const router = useRouter();
  const formId = useId();
  const { stores, activeStoreId } = useErpStores();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [vendorLabel, setVendorLabel] = useState("");
  const isModal = variant === "modal";

  const [vendorId, setVendorId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [lines, setLines] = useState<PurchaseLineFormRow[]>([emptyPurchaseLine()]);
  const [poNumber, setPoNumber] = useState<string | null>(null);

  useEffect(() => {
    if (activeStoreId && !storeId) setStoreId(activeStoreId);
  }, [activeStoreId, storeId]);

  useEffect(() => {
    if (mode !== "edit" || !poId) return;
    adminGet<{ po: ErpPurchaseOrderDetail }>(`erp/purchase-orders/${poId}`)
      .then((res) => {
        const po = res.po;
        setVendorId(po.vendor_id);
        setStoreId(po.store_id ?? "");
        setPoDate(po.po_date ?? new Date().toISOString().slice(0, 10));
        setExpectedDeliveryDate(po.expected_delivery_date ?? "");
        setReference(po.reference ?? "");
        setNotes(po.notes ?? "");
        setDiscount(po.discount ?? 0);
        setPoNumber(po.po_number);
        setLines(
          po.purchase_order_items.length
            ? po.purchase_order_items.map((item) => ({
                key: item.id,
                variantId: item.variant_id,
                productName:
                  item.product_variants?.products?.name
                    ? `${item.product_variants.products.name}${item.product_variants.name ? ` — ${item.product_variants.name}` : ""}`
                    : "Item",
                barcode: item.product_variants?.barcode ?? "",
                expiryDate: "",
                quantity: item.quantity,
                purchasePrice: item.price,
                taxRatePercent: item.tax_rate_percent,
              }))
            : [emptyPurchaseLine()],
        );
      })
      .finally(() => setLoading(false));
  }, [poId, mode]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of lines) {
      const { taxable, taxAmount } = calcPurchaseLine(
        line.quantity,
        line.purchasePrice,
        line.taxRatePercent,
      );
      subtotal += taxable;
      tax += taxAmount;
    }
    const total = roundMoney(Math.max(0, subtotal + tax - discount));
    return { subtotal: roundMoney(subtotal), tax: roundMoney(tax), total };
  }, [lines, discount]);

  function handleCancel() {
    if (isModal) {
      onOpenChange?.(false);
    } else {
      router.push("/admin/purchase-orders");
    }
  }

  function handleSuccessNavigate(id?: string) {
    if (isModal) {
      onOpenChange?.(false);
      onSuccess?.(id);
    }
    if (id) router.push(`/admin/purchase-orders/${id}`);
  }

  function submit() {
    setError(null);
    const apiLines = linesToApiInput(lines);
    if (!vendorId) {
      setError("Vendor is required");
      return;
    }
    if (!storeId) {
      setError("Store is required");
      return;
    }
    if (!apiLines.length) {
      setError("Add at least one valid line item");
      return;
    }

    const payload = {
      vendorId,
      storeId,
      poDate,
      expectedDeliveryDate: expectedDeliveryDate || null,
      reference: reference || null,
      notes: notes || null,
      lines: apiLines,
      discount,
    };

    startTransition(async () => {
      try {
        if (poId) {
          await adminPut(`erp/purchase-orders/${poId}`, payload);
          handleSuccessNavigate(poId);
        } else {
          const res = await adminPost<{ id: string }>("erp/purchase-orders", payload);
          handleSuccessNavigate(res.id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  if (isModal && !open) return null;

  const title = mode === "edit" ? "Edit purchase order" : "New purchase order";

  const totalsSidebar = (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatCurrencyAmount(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="tabular-nums">{formatCurrencyAmount(totals.tax)}</span>
        </div>
        <AdminFormField label="Discount">
          <Input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          />
        </AdminFormField>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrencyAmount(totals.total)}</span>
        </div>
      </CardContent>
    </Card>
  );

  const footer = isModal ? (
    <AdminFormActions
      formId={formId}
      onCancel={handleCancel}
      submitLabel={mode === "edit" ? "Save changes" : "Save PO"}
      pending={pending}
    />
  ) : undefined;

  return (
    <AdminFormShell
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={poNumber ? `PO ${poNumber}` : "Create a purchase order for a vendor."}
      backHref="/admin/purchase-orders"
      breadcrumb={[
        { label: "Purchase orders", href: "/admin/purchase-orders" },
        { label: title },
      ]}
      size="landscape"
      formId={formId}
      footer={footer}
      loading={loading}
      loadingFallback={<AdminPageSkeleton />}
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <AdminFormModalLayout sidebar={totalsSidebar}>
          <AdminFormSection title="Purchase order details">
            <AdminFormGrid cols={3}>
              <AdminFormField label="Vendor" required>
                <VendorSearchSelect
                  value={vendorId || null}
                  selectedLabel={vendorLabel || undefined}
                  onChange={(id, option) => {
                    setVendorId(id ?? "");
                    setVendorLabel(option?.label ?? "");
                  }}
                />
              </AdminFormField>
              <AdminFormField label="Destination store" required>
                <StoreSelect value={storeId} onChange={setStoreId} stores={stores} label="" />
              </AdminFormField>
              <AdminFormField label="PO date">
                <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
              </AdminFormField>
              <AdminFormField label="Expected delivery">
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Reference">
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </AdminFormField>
              <AdminFormField label="Notes" className="sm:col-span-2">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </AdminFormField>
            </AdminFormGrid>
          </AdminFormSection>

          <AdminFormSection title="Line items">
            <PurchaseLinesEditor lines={lines} onChange={setLines} />
          </AdminFormSection>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!isModal ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Link href="/admin/purchase-orders" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
              <Button disabled={pending} onClick={submit}>
                {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Save PO"}
              </Button>
            </div>
          ) : null}
        </AdminFormModalLayout>
      </form>
    </AdminFormShell>
  );
}
