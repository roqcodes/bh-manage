"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { SalesLineFormRow } from "@/common/erp/sales-types";
import { calcSalesLine, roundSalesMoney } from "@/common/erp/sales-types";
import { adminPost } from "@/modules/admin/lib/admin-api-client";
import {
  AdminFormActions,
  AdminFormField,
  AdminFormGrid,
  AdminFormModalLayout,
  AdminFormSection,
  AdminFormShell,
  CustomerSearchSelect,
  ErpDocumentNumberField,
  type ErpFormViewBaseProps,
} from "@/modules/admin/ui";
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

export type SalesOrderFormViewProps = ErpFormViewBaseProps;

export function SalesOrderFormView({
  variant = "page",
  open = true,
  onOpenChange,
  onSuccess,
}: SalesOrderFormViewProps) {
  const router = useRouter();
  const formId = useId();
  const { stores, activeStoreId, storeId, setStoreId, effectiveStoreId, storeRequiredMessage } =
    useActiveStoreFormField({ mode: "create" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isModal = variant === "modal";

  const [customerId, setCustomerId] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [salesPerson, setSalesPerson] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [lines, setLines] = useState<SalesLineFormRow[]>([emptySalesLine()]);

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
      router.push("/admin/erp/sales-orders");
    }
  }

  function handleSuccessNavigate(orderId: string) {
    if (isModal) {
      onOpenChange?.(false);
      onSuccess?.(orderId);
    }
    router.push(`/admin/erp/sales-orders/${orderId}`);
  }

  function handleSubmit() {
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
    const items = apiLines
      .filter((l) => l.variantId)
      .map((l) => ({
        variantId: l.variantId as string,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRatePercent: l.taxRatePercent,
      }));
    if (items.length === 0) {
      setError("Select items from catalog search so variants are linked");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adminPost<{ orderId: string; salesOrderNumber: string }>(
          "erp/sales-orders",
          {
            userId: customerId,
            storeId: effectiveStoreId,
            referenceNumber: referenceNumber || undefined,
            shipmentDate: shipmentDate || undefined,
            deliveryMethod: deliveryMethod || undefined,
            subtotal: totals.subtotal,
            tax: totals.tax,
            discount,
            totalAmount: totals.total,
            taxInclusive,
            items,
          },
        );
        handleSuccessNavigate(res.orderId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create sales order");
      }
    });
  }

  if (isModal && !open) return null;

  const title = "Add sales order";

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
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={taxInclusive}
            onChange={(e) => setTaxInclusive(e.target.checked)}
          />
          Tax inclusive rates
        </label>
      </CardContent>
    </Card>
  );

  const footer = isModal ? (
    <AdminFormActions
      formId={formId}
      onCancel={handleCancel}
      submitLabel="Save"
      pending={pending}
    />
  ) : undefined;

  return (
    <AdminFormShell
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Create a sales order with line items, shipment details, and pricing."
      backHref="/admin/erp/sales-orders"
      breadcrumb={[
        { label: "Sales orders", href: "/admin/erp/sales-orders" },
        { label: title },
      ]}
      size="landscape"
      formId={formId}
      footer={footer}
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <AdminFormModalLayout sidebar={totalsSidebar}>
          <AdminFormSection title="Sales order details">
            <AdminFormGrid cols={3}>
              <AdminFormField label="Customer" required className="sm:col-span-2">
                <CustomerSearchSelect
                  value={customerId || null}
                  selectedLabel={customerLabel || undefined}
                  onChange={(id, option) => {
                    setCustomerId(id ?? "");
                    setCustomerLabel(option?.label ?? "");
                  }}
                />
              </AdminFormField>
              <ErpDocumentNumberField kind="SO" />
              <AdminFormField label="Reference number">
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Sales order date">
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Shipment date">
                <Input
                  type="date"
                  value={shipmentDate}
                  onChange={(e) => setShipmentDate(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Delivery method">
                <Input
                  placeholder="Delivery method"
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Sales person">
                <Input
                  placeholder="Sales person"
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Store">
                <ActiveStoreFormField
                  mode="create"
                  stores={stores}
                  activeStoreId={activeStoreId}
                  storeId={storeId}
                  onStoreIdChange={setStoreId}
                  label=""
                />
              </AdminFormField>
            </AdminFormGrid>
          </AdminFormSection>

          <AdminFormSection title="Order items">
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
              <Link href="/admin/erp/sales-orders" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
              <Button variant="outline" disabled>
                Save as draft
              </Button>
              <Button disabled={pending} onClick={handleSubmit}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : null}
        </AdminFormModalLayout>
      </form>
    </AdminFormShell>
  );
}
